# 実装計画: hiroomi0910.github.io（入口ページ＋エンジニアページ）

作成: 2026-10-29（claude.ai での検討をもとに作成）
実行: Claude Code のクラウドセッション（`claude --cloud`）

---

## 1. ゴール

| ページ | URL | 内容 |
|---|---|---|
| 入口 | `/` | litlink 風の入口。名前・一言紹介・2つの入口（エンジニア／写真）・外部リンク・お問い合わせ。デザインは `docs/design/entrance-b2.dc.html`（B-2 案）を忠実に再現 |
| エンジニア | `/engineer/` | プロフィール、強み、スキル、案件、経歴の年表、個人開発、技術記事、お問い合わせ。入口と同じデザイン言語で新規に組む |
| 404 | `/404.html` | 入口へ戻るリンクだけの簡素なページ |

写真サイト（`https://zekkeiportrait.com`）は別サイト。入口からリンクするだけで、このリポジトリでは触らない。

## 2. ディレクトリ構成（目安）

```
content/                 掲載データ（このリポジトリで唯一の事実の出どころ）
  profile.yaml
  skills.yaml
  projects.yaml          案件（社名なし）
  timeline.yaml          会社員時代の年表
  personal-projects.yaml 個人開発
  site.yaml              リンク・連絡先・写真など設定
docs/
  implementation-plan.md この文書
  design/                デザイン資料（参照用。ビルドに含めない）
public/
  robots.txt
  images/                入口の写真（本人が用意。未着手時はプレースホルダ）
src/
  layouts/Base.astro     共通 <head>（noindex 等の meta はここで一括）
  pages/index.astro
  pages/engineer/index.astro
  pages/404.astro
  components/            Header, EntryCard, LinkList, ContactButton, Footer, ProjectCard, ...
  data/qiita-cache.json  Qiita 記事のキャッシュ
  lib/content.ts         YAML の読み込みと型（zod などで検証）
  lib/qiita.ts           ビルド時取得
scripts/
  check-dist.mjs         ビルド成果物の検査
.github/workflows/
  deploy.yml             ビルド→Pages デプロイ（push to main＋毎日1回）
  lighthouse.yml         PR で Lighthouse CI
```

## 3. Phase と完了条件

### Phase 0: 土台

- Astro を静的出力で作成（`output: 'static'`、`site: 'https://hiroomi0910.github.io'`、`trailingSlash: 'always'`）
- TypeScript strict、`.editorconfig`、Prettier（任意）
- `content/*.yaml` を読み込んで型で検証する `src/lib/content.ts`（必須項目が欠けたらビルド失敗）
- `package.json` の `version` を `0.1.0` から開始

**完了条件**: `npm run build` が通り、`dist/index.html` が出る。

### Phase 1: 共通レイアウトと入口ページ

- `src/layouts/Base.astro` に共通 `<head>`:
  - `<html lang="ja">`、`<meta name="viewport" ...>`、各ページ固有の `<title>` と `<meta name="description">`
  - `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`
  - `<meta name="robots" content="noai, noimageai">`（非標準だが一部が参照）
  - `<meta name="tdm-reservation" content="1">`
  - OGP は付けない（検索・共有で広がらない方針。共有時のカード表示が必要になったら別途）
- 入口ページを `docs/design/entrance-b2.dc.html` どおりに実装（構造・文言・色・余白・フォント）。`.dc.html` 独自の記法（`<x-dc>`、`{{accent}}`、`data-props`）は使わず、素の HTML/CSS に起こす。差し色は `#2F5D50`
- エントリーカードのリンク先: エンジニア → `/engineer/`、写真 → `https://zekkeiportrait.com`（外部リンクは `rel="noopener"`）
- 写真枠: Phase 1.5 で Cloudinary から取得した画像を表示。取得できないときはデザインどおりのプレースホルダ
- お問い合わせボタン（`ContactButton`）: `content/site.yaml` の `contact.form_url` があればフォームへのリンク、無ければメール。メールは `user` と `domain` を別々の値で持ち、クリック時に `mailto:` を組み立てる。HTML・JS バンドルに完全なアドレス文字列が現れないこと
- LinkedIn: `content/site.yaml` の `links.linkedin` が null なら表示しない
- フッター: `© 2026 DYL` と「このサイトの内容を、AI の学習や自動収集に利用することはお断りします。」

**完了条件**: 1280px とスマホ幅（390px）で崩れない。キーボードだけで全リンクとボタンに到達でき、フォーカスが見える。

### Phase 1.5: 入口の写真を Cloudinary から取得

写真サイト（zekkei-portrait、Next.js）の Cloudinary 取り込み処理を、**ビルド時に1枚選んで静的 HTML に埋め込む**形に作り直す。写真サイトはリクエストごとにサーバーで取得しているが、このサイトは静的なので、取得はビルド（GitHub Actions）の中だけで行う。

**設定**: `content/site.yaml` の `entrance.photo`。認証情報は環境変数（ローカルは `.env`、CI は GitHub Secrets）:
`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`

**処理**（`src/lib/cloudinary.ts`、npm の `cloudinary` パッケージ v2 を使用）:

1. Search API で候補を取得: `folder:<folder>/* AND type:upload AND tags:<tag>`。0件なら `folder:<folder>/* AND type:upload`。`with_field('context')` を付ける
2. 横長（`width / height >= min_aspect`）だけに絞る
3. ランダムに1枚選ぶ（毎日のビルドで写真が入れ替わる）
4. 配信 URL を **署名付き**（`sign_url: true`）で生成する。写真サイトのアカウントは Strict Transformations が有効なため、署名がないと変換付き URL が配信されない。`version` も含める
   - 変換: `{ width, aspect_ratio: '3:2', crop: 'fill', gravity: 'auto', fetch_format: 'auto', quality: 'auto' }`
   - 透かし: 写真サイトと同じ `{ overlay: <watermark>, gravity: 'south_east', width: 60, x: 12, y: 12, opacity: 60, effect: 'screen' }`
   - 幅 480 と 960 の2つを作り、`srcset` にする
5. 選んだ URL に HEAD リクエストを送り、200 以外なら次の候補へ（アクセス制限付きの画像を除外。写真サイトと同じ考え方）
6. 結果（URL 2つ、幅・高さ、alt）を返す。alt は `context.custom.alt` → `context.custom.caption` → `alt_fallback` の順
7. **認証情報が無い・API エラー・候補0件のときは `null` を返してプレースホルダを表示**し、ビルドは止めない（警告ログのみ）

**出力**: `<img src="…w_480…" srcset="… 480w, … 960w" sizes="(max-width: 640px) 100vw, 360px" width="480" height="320" alt="…" loading="lazy" decoding="async">`。色面と同じ枠いっぱいに `object-fit: cover`

**守ること**:
- API キー・シークレットはビルド中のサーバー側コードだけで使い、`dist/` に出さない（`check:dist` で `api_key`・`api_secret`・シークレットの値が無いことを検査）
- 写真の元ファイル（原寸）や EXIF は出さない。配信 URL は変換・透かし付きのものだけ
- `res.cloudinary.com` への `preconnect` を入口ページだけに入れる

**参考**（写真サイトの実装の要点。写真サイトのリポジトリは非公開なので、ここに要点だけ写す）:

```ts
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const results = await cloudinary.search
  .expression(`folder:${folder}/* AND type:upload`)
  .sort_by('public_id', 'desc')
  .max_results(100)
  .with_field('context')
  .execute();

const url = cloudinary.url(resource.public_id, {
  resource_type: 'image',
  type: resource.type,
  version: resource.version,
  secure: true,
  sign_url: true,
  transformation: [
    { width: 960, crop: 'limit', fetch_format: 'auto', quality: 'auto' },
    { overlay: 'logo_ws69b6', gravity: 'south_east', width: 100, x: 20, y: 20, opacity: 60, effect: 'screen' },
  ],
});
```

**完了条件**: Secrets がある状態で写真が表示され、無い状態でもプレースホルダでビルドが通る。`dist/` に API キー・シークレットが含まれない。

### Phase 2: エンジニアページ

`content/` のデータだけで組む。セクション順:

1. ヘッダー（名前、肩書き、一言、拠点、入口へ戻るリンク）
2. 自己紹介（`profile.yaml` の `about`）と強み4点
3. スキル（表またはタグ）、資格
4. 案件（`projects.yaml`。期間・役割・規模・技術・担当工程・内容・取り組み）。カード形式、新しい順
5. 経歴の年表（`timeline.yaml`）
6. 個人開発（`personal-projects.yaml`。リンクがあるものだけリンク）
7. 技術記事（Qiita。Phase 3）
8. お問い合わせ（入口と同じボタン）

- 見出しは明朝（Noto Serif JP）、本文はシステムフォント（`docs/design/README.md`）
- ページ内目次（アンカー）を上部に置く。スマホでは横スクロールのチップ
- `[要確認]` のある項目はそのまま表示せず、ビルド時に警告を出す（公開時に残らないように）

**完了条件**: 全データが表示され、`[要確認]` が残っていれば `npm run build` が警告を出す。

### Phase 3: Qiita 記事のビルド時取得

- `GET https://qiita.com/api/v2/users/hiroomi0910/items?per_page=100` をビルド時に取得（`QIITA_TOKEN` があれば `Authorization: Bearer`）。未認証は 1 時間 60 回まで
- 表示項目: タイトル、公開日、タグ、いいね数（任意）。新しい順
- 取得結果を `src/data/qiita-cache.json` に保存してコミット可能にし、**取得に失敗したらキャッシュでビルドを続ける**（ビルドを落とさない）
- 本文は保存しない（タイトル・URL・日付・タグ・いいね数のみ）

**完了条件**: ネットワークを切った状態でもキャッシュでビルドが通る。

### Phase 4: robots.txt・検査・Lighthouse CI

- `public/robots.txt` を下記の全文で作成
- `scripts/check-dist.mjs`（`npm run check:dist`、ビルド後に実行）で `dist/` 内の全 HTML を検査し、1つでも満たさなければ失敗:
  - `noindex` を含む robots meta がある
  - `tdm-reservation` meta がある
  - `@gmail.com` と `mailto:` の文字列が HTML にも JS にも無い
  - `[要確認` が残っていない
  - `sitemap` 系のファイルが無い
  - `api_key`・`api_secret` の文字列、および環境変数 `CLOUDINARY_API_SECRET` の値が HTML にも JS にも無い
- `.github/workflows/lighthouse.yml`: PR で `dist/` を静的配信して Lighthouse CI（`@lhci/cli` か `treosh/lighthouse-ci-action`）を `/` と `/engineer/` に実行。assert: performance・accessibility・best-practices が 0.8 以上でエラー（0.9 未満は警告）。SEO は assert しない
- フォント: Noto Serif JP は見出しに使う文字だけのサブセット（Google Fonts の `text=` 指定、または fonttools で woff2 を自前生成して `public/fonts/` に置く）。ページあたりのフォント転送量 100KB 以下を目安

**完了条件**: `npm run build && npm run check:dist` が通り、Lighthouse CI が 3 カテゴリとも 80 以上。

### Phase 5: デプロイ

- `.github/workflows/deploy.yml`: `main` への push と毎日 1 回（cron、日本時間の早朝。毎時0分は避ける）で、ビルド→`check:dist`→GitHub Pages へデプロイ（公式の `withastro/action` と `actions/deploy-pages`）
- ビルドのステップに Secrets を環境変数として渡す: `QIITA_TOKEN`（任意）、`CLOUDINARY_CLOUD_NAME`・`CLOUDINARY_API_KEY`・`CLOUDINARY_API_SECRET`
- README に、Pages の設定（Settings → Pages → Source を「GitHub Actions」）と Secrets の登録手順を書く

**完了条件**: PR を作成し、最終報告で本人がやること（Pages の Source 設定、Secrets 登録、マージ、表示確認）を列挙する。

## 4. robots.txt（全文）

```
# AI の学習・AI 検索・自動収集はお断りします
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: anthropic-ai
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Meta-ExternalAgent
User-agent: Meta-ExternalFetcher
User-agent: CCBot
User-agent: Bytespider
User-agent: Amazonbot
User-agent: cohere-ai
User-agent: Diffbot
User-agent: YouBot
User-agent: DuckAssistBot
User-agent: Timpibot
Disallow: /

# 検索エンジンは巡回を許可し、各ページの noindex を読ませる
User-agent: *
Allow: /
```

## 5. やらないこと

- 独自ドメイン、アクセス解析、Cookie、OGP、サイトマップ
- 写真サイト（zekkei-portrait）の変更
- `content/` にない経歴・実績・数字の追加
- 非公開リポジトリへのリンク（zekkei-portrait、qiita-articles などは作品紹介のみ）

## 6. 最終報告に含めること

- 作成した PR のリンクと、各 Phase の完了条件の結果（Lighthouse の点数を含む）
- 残っている `[要確認]` の一覧
- 本人がやること（Pages 設定、Secrets の登録、Cloudinary で入口に使いたい写真へ `entrance` タグを付ける、LinkedIn の扱い、フォームの URL）
