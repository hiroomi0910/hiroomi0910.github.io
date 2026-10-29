# デザイン資料

`entrance-b2.dc.html` は claude.ai のデザインキャンバスで作った入口ページの確定案（B-2「エディトリアル」改良版）。独自記法（`<x-dc>`、`<helmet>`、`{{accent}}`、`data-props`、`DCLogic`）を含むため **そのままは使わない**。構造・文言・スタイル値を読み取って Astro で素の HTML/CSS に起こすこと。`{{accent}}` は `#2F5D50` に置き換える。

ビルドには含めない（`docs/` は Astro の対象外）。

## デザイントークン

| トークン | 値 | 用途 |
|---|---|---|
| `--color-bg` | `#F6F4EF` | 地（生成り） |
| `--color-surface` | `#FBFAF7` | カードの地 |
| `--color-surface-hover` | `#FFFFFF` | カードのホバー |
| `--color-ink` | `#1C1B19` | 本文・見出し |
| `--color-ink-sub` | `#4A4640` | 説明文 |
| `--color-muted` | `#5E5A53` | ラベル・補足（地の上で 4.5:1 以上） |
| `--color-line` | `#DDD8CE` | 罫線・枠 |
| `--color-line-hover` | `#BDB6A8` | 枠のホバー |
| `--color-accent` | `#2F5D50` | 差し色（深緑）。ボタン、エンジニアカードの色面、ラベル |
| `--color-accent-ink` | `#EDF3F0` | 差し色の上の文字 |
| `--color-photo-placeholder` | `#CFC9BD` | 写真枠のプレースホルダ |
| `--font-serif` | `'Noto Serif JP', serif`（weight 600 のみ） | 名前・見出し・カードのタイトル・数字 |
| `--font-sans` | 本番はシステムフォント: `system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif` | 本文（デザインでは Noto Sans JP を読み込んでいるが、Lighthouse のため本番は読み込まない） |

## 寸法の目安（1280px 時）

- コンテナ最大幅 1120px、上余白 88px、左右 32px
- 左カラム（`flex: 1 1 300px`）と右カラム（`flex: 999 1 560px`）、列間 72px。狭い画面では縦積み
- 名前 64px / 明朝の一言 20px / 本文 15px（行間 1.95）/ ラベル 12px（字間 0.22–0.24em）
- エントリーカード: 色面（`flex: 1 1 220px`、最小高さ 236px）＋本文（パディング 36px 40px）、カード間 20px
- 外部リンク: `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`、各行の高さ 56px
- お問い合わせボタン: 高さ 48px、角丸 2px、差し色の地に白文字

## エンジニアページ

デザイン案は無い。入口と同じトークン・タイポグラフィ・罫線の使い方で組む（白い箱を多用せず、生成りの地に罫線で区切る。カードは入口のエントリーカードと同じ枠の扱い）。
