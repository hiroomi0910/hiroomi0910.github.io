// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// ローカルでは .env の認証情報を process.env に読み込む（CI は GitHub Secrets から渡す）。
// import.meta.env を使うとビルド時に値がコードへ埋め込まれうるため、サーバー側コードは process.env だけを読む。
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  site: 'https://hiroomi0910.github.io',
  output: 'static',
  trailingSlash: 'always',
});
