// 入口の写真枠に使う画像を、ビルド時に Cloudinary から1枚選ぶ。
// 認証情報はビルド中のサーバー側コードだけで使い、出力には署名付きの配信 URL だけを残す。
// 認証情報が無い・API エラー・候補0件のときは null を返し、ビルドは止めない（警告のみ）。
import { v2 as cloudinary } from 'cloudinary';
import type { Site } from './content';

export interface EntrancePhoto {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
}

type PhotoConfig = Site['entrance']['photo'];

interface SearchResource {
  public_id: string;
  type: string;
  version: number;
  width: number;
  height: number;
  // Search API は context をそのまま、Admin API は custom の下に返すため両方を受ける
  context?: { custom?: Record<string, string> } & Record<string, unknown>;
}

const WIDTHS = [480, 960] as const;
const MAX_HEAD_TRIES = 10;
const HEAD_TIMEOUT_MS = 10_000;

function warn(message: string): void {
  console.warn(`[cloudinary] ${message}（プレースホルダを表示します）`);
}

function pickAlt(resource: SearchResource, fallback: string): string {
  const ctx = resource.context ?? {};
  const custom = ctx.custom ?? {};
  const candidates = [custom.alt, ctx.alt, custom.caption, ctx.caption];
  const found = candidates.find((v): v is string => typeof v === 'string' && v.trim() !== '');
  return found?.trim() ?? fallback;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function search(expression: string): Promise<SearchResource[]> {
  const result: { resources?: SearchResource[] } = await cloudinary.search
    .expression(expression)
    .sort_by('public_id', 'desc')
    .max_results(100)
    .with_field('context')
    .execute();
  return result.resources ?? [];
}

function buildUrl(resource: SearchResource, width: number, watermark: string | null): string {
  return cloudinary.url(resource.public_id, {
    resource_type: 'image',
    type: resource.type,
    version: resource.version,
    secure: true,
    // 写真サイトのアカウントは Strict Transformations が有効なため署名が必要
    sign_url: true,
    transformation: [
      { width, aspect_ratio: '3:2', crop: 'fill', gravity: 'auto', fetch_format: 'auto', quality: 'auto' },
      ...(watermark
        ? [{ overlay: watermark, gravity: 'south_east', width: 60, x: 12, y: 12, opacity: 60, effect: 'screen' }]
        : []),
    ],
  });
}

async function isDeliverable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(HEAD_TIMEOUT_MS) });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getEntrancePhoto(config: PhotoConfig): Promise<EntrancePhoto | null> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    warn('認証情報（CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET）がありません');
    return null;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  try {
    const base = `folder:${config.folder}/* AND type:upload`;
    let resources = config.tag ? await search(`${base} AND tags:${config.tag}`) : [];
    if (resources.length === 0) resources = await search(base);

    const landscape = resources.filter((r) => r.width > 0 && r.height > 0 && r.width / r.height >= config.min_aspect);
    if (landscape.length === 0) {
      warn(`横長（幅÷高さ >= ${config.min_aspect}）の候補がありません`);
      return null;
    }

    for (const resource of shuffle(landscape).slice(0, MAX_HEAD_TRIES)) {
      const [small, large] = WIDTHS.map((w) => buildUrl(resource, w, config.watermark));
      if (!small || !large) continue;
      // アクセス制限付きなど、配信できない画像は除く
      if (!(await isDeliverable(small))) continue;
      return {
        src: small,
        srcset: `${small} ${WIDTHS[0]}w, ${large} ${WIDTHS[1]}w`,
        width: WIDTHS[0],
        height: Math.round((WIDTHS[0] * 2) / 3),
        alt: pickAlt(resource, config.alt_fallback),
      };
    }
    warn('配信できる候補がありません');
    return null;
  } catch (error) {
    // エラーオブジェクトに認証情報が含まれないよう、メッセージだけを出す
    const message = error instanceof Error ? error.message : (error as { error?: { message?: string } })?.error?.message;
    warn(`API エラー: ${message ?? '不明なエラー'}`);
    return null;
  }
}
