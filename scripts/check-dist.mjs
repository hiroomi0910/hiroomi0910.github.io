// ビルド成果物（dist/）の検査。1つでも満たさなければ終了コード 1 で失敗する。
// 使い方: npm run build && npm run check:dist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`${DIST}/ がありません。先に npm run build を実行してください。`);
  process.exit(1);
}

const errors = [];
const fail = (file, message) => errors.push(`${relative(DIST, file) || file}: ${message}`);

const htmlFiles = files.filter((f) => f.endsWith('.html'));
const textFiles = files.filter((f) => /\.(html|js|mjs|css|json|txt|xml|svg)$/.test(f));

if (htmlFiles.length === 0) errors.push('HTML ファイルがありません');

// 本文に出してはいけない文字列
const forbidden = [
  { pattern: '@gmail.com', label: 'メールアドレス（@gmail.com）' },
  { pattern: 'mailto:', label: 'mailto:' },
  { pattern: '[要確認', label: '[要確認]' },
  { pattern: 'api_key', label: 'api_key' },
  { pattern: 'api_secret', label: 'api_secret' },
];
const secret = process.env.CLOUDINARY_API_SECRET;
if (secret) forbidden.push({ pattern: secret, label: 'CLOUDINARY_API_SECRET の値' });
const apiKey = process.env.CLOUDINARY_API_KEY;
if (apiKey) forbidden.push({ pattern: apiKey, label: 'CLOUDINARY_API_KEY の値' });

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const robots = [...html.matchAll(/<meta\s+name="robots"\s+content="([^"]*)"/gi)].map((m) => m[1]);
  if (!robots.some((c) => /\bnoindex\b/.test(c))) fail(file, 'noindex を含む robots meta がありません');
  if (!/<meta\s+name="tdm-reservation"\s+content="1"/i.test(html)) fail(file, 'tdm-reservation meta がありません');
  if (!/<html[^>]*\slang="ja"/i.test(html)) fail(file, '<html lang="ja"> がありません');
}

for (const file of textFiles) {
  const text = readFileSync(file, 'utf8');
  for (const { pattern, label } of forbidden) {
    if (text.includes(pattern)) fail(file, `${label} が含まれています`);
  }
}

for (const file of files) {
  if (/sitemap/i.test(relative(DIST, file))) fail(file, 'サイトマップのファイルがあります');
}

if (!files.some((f) => relative(DIST, f) === 'robots.txt')) errors.push('robots.txt がありません');

if (errors.length > 0) {
  console.error(`check:dist 失敗（${errors.length} 件）`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check:dist OK（HTML ${htmlFiles.length} 件、検査したファイル ${textFiles.length} 件）`);
