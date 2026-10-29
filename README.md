# hiroomi0910.github.io

Hiroomi のポートフォリオ（入口ページ＋エンジニアページ）。Astro で静的に生成し、GitHub Pages で公開する。

- 実装計画: [`docs/implementation-plan.md`](docs/implementation-plan.md)
- 作業ルール: [`CLAUDE.md`](CLAUDE.md)
- 掲載データ: [`content/`](content/)

このサイトは検索エンジンに登録しない設定（noindex）で、AI の学習や自動収集への利用をお断りしています。

## 開発

Node.js 22.22 以上（CI は `.nvmrc` の 24）と npm を使う。

```sh
npm ci
npm run dev          # 開発サーバー
npm run build        # dist/ に静的出力
npm run check:dist   # ビルド成果物の検査（noindex、メールアドレス・認証情報が出ていないか など）
npm run check        # 型チェック（astro check）
```

ローカルで入口の写真・Qiita の取得を試すときは、`.env.example` を `.env` にコピーして値を入れる（`.env` はコミットしない）。値が無くても、写真はプレースホルダ、記事は `src/data/qiita-cache.json` のキャッシュでビルドできる。

| 内容 | 場所 |
|---|---|
| 掲載する事実（プロフィール・案件・経歴など） | `content/*.yaml`（`src/lib/content.ts` で検証。必須項目が欠けるとビルド失敗、`[要確認` を含む値は表示せず警告） |
| 入口の写真 | ビルド時に Cloudinary から1枚選ぶ（`src/lib/cloudinary.ts`、設定は `content/site.yaml` の `entrance.photo`） |
| Qiita の記事一覧 | ビルド時に取得し `src/data/qiita-cache.json` に保存。失敗したらキャッシュを使う（`src/lib/qiita.ts`） |
| デザイントークン | `src/styles/global.css`（元は `docs/design/README.md`） |

## デプロイ

`main` への push と毎日 1 回（日本時間 5:17 ごろ）、`.github/workflows/deploy.yml` がビルド → `check:dist` → GitHub Pages へのデプロイを行う。Actions タブから手動でも実行できる。PR では `.github/workflows/lighthouse.yml` が `/` と `/engineer/` に Lighthouse CI を実行する（Performance・Accessibility・Best Practices が 80 未満で失敗、90 未満で警告）。

### 初回の設定

1. **Pages の Source**: リポジトリの Settings → Pages → Build and deployment → Source を「GitHub Actions」にする
2. **Secrets の登録**: Settings → Secrets and variables → Actions → New repository secret で次を登録する

   | 名前 | 必須 | 内容 |
   |---|---|---|
   | `CLOUDINARY_CLOUD_NAME` | 写真を出すなら必須 | Cloudinary のクラウド名 |
   | `CLOUDINARY_API_KEY` | 写真を出すなら必須 | Cloudinary の API キー |
   | `CLOUDINARY_API_SECRET` | 写真を出すなら必須 | Cloudinary の API シークレット |
   | `QIITA_TOKEN` | 任意 | Qiita のアクセストークン（`read_qiita` スコープ）。無くても 1 時間 60 回まで取得できる |

   Cloudinary の値は Cloudinary のコンソール（Settings → API Keys）で確認できる。未登録でもビルドは通り、写真枠はプレースホルダになる。
3. **入口の写真**: Cloudinary の `portfolio` フォルダで、入口に使いたい横長の写真に `entrance` タグを付ける（無ければフォルダ全体の横長写真から選ぶ）

GitHub は、リポジトリに 60 日間動きが無いと定期実行（schedule）を止める。止まったら Actions タブから有効にし直す。
