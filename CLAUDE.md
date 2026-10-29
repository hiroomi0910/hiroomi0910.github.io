# CLAUDE.md — hiroomi0910.github.io

Hiroomi のポートフォリオサイト（入口ページ＋エンジニアページ）。GitHub Pages のユーザーサイトとして `https://hiroomi0910.github.io/` に公開する。

**最初に `docs/implementation-plan.md` を読み、Phase の順に進めること。** 各 Phase の「完了条件」を満たしてから次へ進む。

## このリポジトリは公開リポジトリ

GitHub Pages（無料プラン）のため、ソースもコミット履歴もすべて公開になる。次のものは **絶対にコミットしない**（ファイル名・コメント・コミットメッセージ・テストデータを含む）。

- 本人の姓・フルネーム、住所（市区町村を含む）、年齢、家族、電話番号
- 案件の社名・サービス名・クライアント名、在籍企業名・出向先名、社外秘の金額
- 本名入りのメールアドレス
- API トークン類（`QIITA_TOKEN`、`CLOUDINARY_API_KEY`・`CLOUDINARY_API_SECRET` は GitHub Secrets で渡す。`.env` はコミットしない）

掲載してよい情報は `content/` 以下のデータに入っているものだけ。**`content/` にない事実を書き足さない**（経歴・実績・数字を推測で補わない）。足りない情報は `[要確認：…]` のプレースホルダにして、最終報告で一覧にする。

表示名は「Hiroomi」、屋号は「DYL」（コピーライトは `© 2026 DYL`）。GitHub・Qiita のハンドル `hiroomi0910`、拡張機能の公開者名 `hiroomi` は出してよい。

## 非機能要件（全ページ共通）

- **検索結果に出さない**: 全ページの `<head>` に `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`。サイトマップは作らない。robots.txt で Googlebot・Bingbot を Disallow しない（noindex を読ませるため）
- **AI・自動収集を拒否**: `public/robots.txt` で AI クローラーを拒否（`docs/implementation-plan.md` に全文）。meta に `noai, noimageai` と `<meta name="tdm-reservation" content="1">`。フッターに拒否の文言
- **メールアドレスを HTML・JS の文字列としてそのまま置かない**: ボタン押下時に分割した文字列から組み立てる。`mailto:` を静的 HTML に書かない
- **Lighthouse**: Performance・Accessibility・Best Practices を各 80 以上（目標 90 以上）。SEO は noindex のため対象外
- アクセシビリティ: コントラスト 4.5:1 以上、キーボード操作、フォーカス表示、タッチ領域 44px 以上、`lang="ja"`

## 技術

- Astro（最新の安定版、静的出力）+ TypeScript（strict）。UI フレームワークは使わない（Astro コンポーネントのみ）。クライアント JS はお問い合わせボタン程度に限る
- CSS は素の CSS ＋ CSS カスタムプロパティ（デザイントークンは `docs/design/README.md`）
- パッケージマネージャは npm。Node.js は LTS
- デプロイは GitHub Actions（公式の Astro → GitHub Pages ワークフロー）

## 作業の約束

- コミットメッセージのタイトルは Conventional Commits（`feat:` / `fix:` / `chore:` / `docs:` / `ci:` など、`<type>(<scope>): <要約>`）。種類の違う変更は別コミット
- 変更のたびに `package.json` の `version` を上げる（`chore(release): v<版>`）
- コード中のコメントとドキュメントは日本語でよい
- `main` に直接 push せず、作業ブランチで PR を作る。マージは本人が行う
- 外部サービスの仕様（Astro、GitHub Pages、Qiita API、Lighthouse CI）は推測せず公式ドキュメントで確認する
- 判断に迷う点・`[要確認]` は最終報告にまとめる
