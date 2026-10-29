// Qiita の記事一覧をビルド時に取得する。
// 取得できたら src/data/qiita-cache.json に保存し、失敗したらそのキャッシュでビルドを続ける。
// 本文は保存しない（タイトル・URL・日付・タグ・いいね数のみ）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const USER = 'hiroomi0910';
const ENDPOINT = `https://qiita.com/api/v2/users/${USER}/items?per_page=100`;
const CACHE_PATH = join(process.cwd(), 'src/data/qiita-cache.json');
const TIMEOUT_MS = 15_000;

const articleSchema = z.object({
  title: z.string(),
  url: z.url(),
  created_at: z.string(),
  tags: z.array(z.string()),
  likes_count: z.number().int().nonnegative(),
});
export type Article = z.infer<typeof articleSchema>;

// API のレスポンスから必要な項目だけを取り出す
const apiItemSchema = z.object({
  title: z.string(),
  url: z.url(),
  created_at: z.string(),
  tags: z.array(z.object({ name: z.string() })),
  likes_count: z.number().int().nonnegative(),
  private: z.boolean().optional(),
});

function sortNewestFirst(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function readCache(): Article[] {
  try {
    return z.array(articleSchema).parse(JSON.parse(readFileSync(CACHE_PATH, 'utf8')));
  } catch (error) {
    console.warn(`[qiita] キャッシュを読めません: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function fetchArticles(): Promise<Article[]> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = process.env.QIITA_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(ENDPOINT, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = z.array(apiItemSchema).parse(await res.json());
  return items
    .filter((item) => !item.private)
    .map((item) => ({
      title: item.title,
      url: item.url,
      created_at: item.created_at,
      tags: item.tags.map((t) => t.name),
      likes_count: item.likes_count,
    }));
}

let pending: Promise<Article[]> | undefined;

/** 新しい順の記事一覧。取得に失敗したらキャッシュを返す（ビルドは止めない） */
export function getArticles(): Promise<Article[]> {
  pending ??= (async () => {
    try {
      const articles = sortNewestFirst(await fetchArticles());
      const json = `${JSON.stringify(articles, null, 2)}\n`;
      let current = '';
      try {
        current = readFileSync(CACHE_PATH, 'utf8');
      } catch {
        // キャッシュが無ければ新しく作る
      }
      if (json !== current) writeFileSync(CACHE_PATH, json);
      return articles;
    } catch (error) {
      console.warn(
        `[qiita] 記事を取得できませんでした（${error instanceof Error ? error.message : String(error)}）。キャッシュを使います`,
      );
      return sortNewestFirst(readCache());
    }
  })();
  return pending;
}
