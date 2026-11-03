# 実装計画: エンジニアページに「このサイトの作り」を追加

作成: 2026-11-04（claude.ai での検討をもとに作成）
元にした図: claude.ai のアーティファクト「ポートフォリオサイト 構成図」（参照用。ここに書いた内容が正）

---

## 1. ゴール

`/engineer/` の最後（技術記事の後、お問い合わせの前）に「このサイトの作り」セクションを追加し、サイトの構成図と要点3つを載せる。

- 構成図は **ビルド時に生成する静的な SVG**。クライアント JS は使わない（CLAUDE.md の「クライアント JS はお問い合わせボタン程度」を守る）
- 図の中身（グループ・ノード・線・説明文）は `content/architecture.yaml` に置く（「掲載してよい情報は content/ だけ」のルールに合わせる）
- 見た目は既存のデザイントークン（`docs/design/README.md`）に合わせる。生成りの地・罫線・深緑の差し色

## 2. アイコンの方針（ブランドガイドライン確認済み）

2026-11-04 に各社のガイドラインを確認した結果。**公式ロゴは使ってよいと確認できたものだけ使い、それ以外は名前を文字で書き、汎用アイコン（Material Symbols）を添える。**

| サービス | 判断 | 根拠（要旨） |
|---|---|---|
| GitHub | **公式ロゴ（Invertocat）を使う** | GitHub へのリンクや「GitHub と連携している」ことを示す用途は許可されている。条件: 公式ファイルを改変しない（色・縦横比・サイズ比の変更禁止）、黒か白で使う、影・グラデーション・低コントラストの背景は禁止、自分の名前より目立たせない、提携・推薦を示唆しない。入手先: https://brand.github.com/GitHub_Logos.zip |
| Qiita | **文字＋汎用アイコン**（ロゴは使わない） | 非営利（個人の学習・研究・OSS・技術コミュニティ）は自由だが、営利目的は事前の許諾が必要。仕事の受注・転職に使うポートフォリオは営利と読める余地があるため使わない。使いたくなったら Qiita に問い合わせる |
| Cloudflare | **文字のみ**（ロゴは使わない） | ロゴの使用は書面での許可が必要（例外は顧客向けの Web バッジのみ）。社名を文字で書くのは可。その場合、最初の出現に登録商標の表示（Cloudflare®）と、商標の帰属表示が必要 |
| Cloudinary | **文字＋汎用アイコン** | 公開のガイドラインに第三者の利用についての記載がない（「迷ったらブランドチームへ」）。確認が取れるまで使わない |
| Google Fonts | **文字＋汎用アイコン** | Google のロゴは使わない。図の汎用アイコンには Google の Material Symbols（Apache License 2.0）を使う |
| Astro・Lighthouse・Claude・Vercel・LinkedIn など | **文字＋汎用アイコン** | 今回はガイドラインを確認していない。使う場合は先に確認する |

**汎用アイコン（Material Symbols）の入れ方**
- Google Fonts から読み込まず、使うアイコンの SVG だけを `src/assets/icons/` に置く（リクエストを増やさないため）。入手は https://fonts.google.com/icons または https://github.com/google/material-design-icons から。スタイルは Outlined、太さ 400 で統一
- 色は `currentColor`。グループの色を CSS で当てる
- ライセンス表記（Apache License 2.0）を `src/assets/icons/LICENSE` に置く

**公式ロゴの入れ方（GitHub）**
- `GitHub_Logos.zip` の中の Invertocat（黒）を `src/assets/brand/github/` にそのまま置く。中身は編集しない（色・パス・余白を変えない）。拡大縮小は縦横比を保ったまま行う
- `currentColor` で色を変えない。背景は白のタイル（コントラストを確保）
- Astro での SVG の取り込み方（コンポーネントとして読み込むか、`<img>` で読むか）は公式ドキュメントで確認する。ブランドロゴは内容を変えないことが条件なので、`<img src>` で元ファイルのまま読む方法を優先する

**商標の表記**（セクションの最後に小さく）
> GitHub は GitHub, Inc. の商標です。Cloudflare は Cloudflare, Inc. の米国およびその他の国における登録商標です。その他の会社名・サービス名は、各社の商標または登録商標です。

## 3. 図の中身（`content/architecture.yaml`）

図は左右2列＋真ん中に線の通り道。4段構成。

| 段 | 左 | 右 |
|---|---|---|
| 1 | 設計・開発: Claude（調査・掲載内容・デザイン案）／Claude Code（クラウドで実装、PR を作成）／GitHub（公開リポジトリ、マージは本人） | GitHub Actions: Deploy（main への push と毎朝 5:17）／Lighthouse CI（PR ごと、80 点未満で失敗）／Secrets（Cloudinary の鍵をビルドにだけ渡す） |
| 2 | ビルドの材料: content/*.yaml（掲載データ、zod で検証）／Cloudinary（写真を1枚選ぶ、署名・透かし付き）／Qiita API v2（記事一覧、失敗時はキャッシュ） | ビルド: Astro（静的出力、TypeScript strict）／check:dist（noindex・メール・API キーを検査） |
| 3 | （左端に訪問者）配信 GitHub Pages: / 入口／/engineer/／robots.txt（AI クローラー約20種を拒否） | ブラウザが直接読み込むもの: res.cloudinary.com（入口の写真）／Google Fonts（明朝体を使う文字だけ） |
| 4 | クローラーへの対応: 検索エンジン（巡回は許可、noindex で載らない）／AI クローラー（robots.txt で拒否、noai・tdm-reservation） | リンク先: ZEKKEI PORTRAIT（Vercel で配信、DNS は Cloudflare®）／GitHub・Qiita・LinkedIn・VS Code 拡張／お問い合わせ（押したときにアドレスを組み立て） |

線（種類: main＝公開までの主な流れ、sub＝データの取得、ops＝自動実行・リンク、deny＝拒否）:

| 始点 → 終点 | 種類 | ラベル | 引き方 |
|---|---|---|---|
| Claude → Claude Code | main | 仕様・計画 | 横 |
| Claude Code → GitHub | main | PR | 横 |
| GitHub → Deploy | main | マージ | 横（真ん中の通り道を通る） |
| GitHub → Lighthouse CI | ops | PR ごとに検査 | 上に回り込む |
| Deploy → ビルド（グループ上端、Astro の真上） | main | ビルド開始 | 下→横→下 |
| ビルドの材料（グループ右端） → Astro | sub | 材料を読む | 横 |
| Astro → check:dist | main | なし | 横 |
| check:dist → 配信（グループ上端、/engineer/ の真上） | main | 合格したら公開 | 下→横→下 |
| 訪問者 → 配信（グループ左端） | main | HTTPS | 横（ラベルは線の下） |
| 配信 → ブラウザが直接読み込むもの | sub | 写真・字体 | 横 |
| 検索エンジン（グループ上端から） → 配信（下端） | deny | noindex | 縦 |
| AI クローラー（グループ上端から） → 配信（下端） | deny | 拒否 | 縦 |
| 配信（右寄り） → リンク先（左寄り） | ops | リンク | 下→横→下 |

ルール:
- 線はグループの見出しの文字、ノードのタイルと名前をまたがない
- 線同士が平行に重ならない。ラベルは線の上か横で、枠や文字に重ならない
- 座標は固定のレイアウト（幅 1240px 前後の基準）からビルド時に計算する。`src/lib/architecture.ts` に配置と線の計算を置き、`src/components/ArchitectureDiagram.astro` が SVG を出す

要点3つ（図の下）:
1. **サーバーを持たない**: 外部データ（写真・記事）はビルドのときだけ取りに行き HTML に焼き込む／毎朝 5:17 に作り直すので入口の写真が日替わり／API の鍵は Secrets にだけ置き、公開物に出ないことを check:dist で確かめる
2. **検索にも AI にも渡さない**: 全ページ noindex／検索エンジンの巡回は止めない（止めると noindex が読まれない）／AI クローラーは robots.txt と meta で拒否（守るかは相手次第の宣言）
3. **公開前に自動で止める**: PR ごとに Lighthouse CI／メールアドレスや `mailto:` の文字列が残ればビルド失敗／案件は社名・URL を出さず業種と担当内容で書く

※ Lighthouse の点数は時期で変わるので、図や本文に数字を書かない。

## 4. 表示と品質

- PC: 図はセクション幅いっぱい（`viewBox` で縮小）。スマホ: 図の最小幅を 960px 程度にして、図の箱の中だけ横スクロール（ページ全体は横スクロールさせない）
- アクセシビリティ: SVG に `role="img"` と短い `aria-label`。図の内容は、図の下の要点と「構成の一覧」（グループごとの箇条書き、`<details>` で折りたたみ）でも読めるようにする
- 文字は SVG 内でも 11px 相当以上（PC 表示時）。コントラスト 4.5:1 以上
- 目次（ページ上部のチップ）に「このサイトの作り」を追加
- Lighthouse の 3 カテゴリが 80 以上のまま（目標 90 以上）。check:dist が通ること

## 5. 完了条件

- `npm run build && npm run check:dist` が通る
- 1280px と 390px で図が崩れず、ページ全体に横スクロールが出ない
- 公式ロゴは GitHub だけで、ファイルを改変していない（zip の中身とバイト一致）
- 商標の表記がある
- `package.json` の version を上げ（`chore(release)`）、PR を作成。マージは本人
