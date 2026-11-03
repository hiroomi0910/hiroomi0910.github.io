// 「このサイトの作り」の構成図の配置と線を計算する（ビルド時のみ実行）。
// 中身は content/architecture.yaml、座標はここの固定レイアウト（幅 1240px 基準）で決める。
// 線がグループの見出し・ノードのタイル・名前・説明文・ラベルをまたいだら例外を投げてビルドを止める。
import { architecture, type Architecture } from './content';

type Tone = Architecture['groups'][number]['tone'];
type EdgeKind = Architecture['edges'][number]['kind'];
type Endpoint = Architecture['edges'][number]['from'];

export const WIDTH = 1240;

// 2列＋真ん中の通り道
const LEFT = { x: 20, w: 550 };
const RIGHT = { x: 670, w: 550 };
const CORRIDOR = { x0: LEFT.x + LEFT.w, x1: RIGHT.x };

const TOP = 64; // 1段目の上端（上に回り込む線の余白）
const OVER_Y = 34; // 上に回り込む線の高さ
const ROW_GAP = 80;
const HEAD_H = 46; // グループの見出しの帯
const PAD_X = 16;
const PAD_BOTTOM = 18;
const TILE = 44;
const ICON = 24;
const NAME_SIZE = 14;
const DESC_SIZE = 13;
const LINE_H = 18;
const TITLE_SIZE = 15;
const LABEL_SIZE = 13;

interface GroupLayout {
  row: number;
  x: number;
  w: number;
  nodeW: number;
  /** ノードの左端（絶対座標）。省略時は均等割り */
  lefts?: number[];
  /** 均等割りにするときの枠の数（ノード数より多くすると左寄せで並ぶ） */
  slots?: number;
}

const GROUPS: Record<string, GroupLayout> = {
  dev: { row: 0, ...LEFT, nodeW: 140 },
  actions: { row: 0, ...RIGHT, nodeW: 140 },
  materials: { row: 1, ...LEFT, nodeW: 140 },
  build: { row: 1, ...RIGHT, nodeW: 140, slots: 3 },
  delivery: { row: 2, x: 150, w: 420, nodeW: 120 },
  browser: { row: 2, ...RIGHT, nodeW: 170, slots: 3 },
  crawlers: { row: 3, ...LEFT, nodeW: 150, lefts: [175, 345] },
  links: { row: 3, ...RIGHT, nodeW: 170 },
};
const VISITOR = { row: 2, cx: 56, nodeW: 72 };

// ---- 文字幅の見積もりと折り返し ----

function charWidth(c: string, size: number): number {
  if (c === ' ') return size * 0.32;
  if (/[A-Z]/.test(c)) return size * 0.66;
  if (/[\u0000-ÿ]/.test(c)) return size * 0.58;
  return size;
}

export function textWidth(s: string, size: number): number {
  return [...s].reduce((sum, c) => sum + charWidth(c, size), 0);
}

const NO_LINE_START = /^[、。・，．）」』,.:;!?％%®]/;

/** 1字ずつ折り返す（行頭禁則つき）。英数字の並びは切らない */
function wrapChars(s: string, size: number, max: number): string[] {
  const tokens = s.match(/[\x21-\x7e]+|\s+|./gu) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const t of tokens) {
    const next = line + t;
    if (line.trim() && textWidth(next.trimEnd(), size) > max && !NO_LINE_START.test(t)) {
      lines.push(line.trim());
      line = t.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/**
 * 句読点（、・）の後ろで優先して折り返す。区切りの間が1行に収まらないときだけ1字ずつ折り返す
 */
function wrapLine(s: string, size: number, max: number): string[] {
  const phrases = s.match(/[^、・，]+[、・，]?|[、・，]+/gu) ?? [s];
  const lines: string[] = [];
  let line = '';
  for (const p of phrases) {
    const next = line + p;
    if (textWidth(next.trimEnd(), size) <= max) {
      line = next;
      continue;
    }
    if (line.trim()) lines.push(line.trim());
    if (textWidth(p.trimEnd(), size) <= max) {
      line = p;
    } else {
      const parts = wrapChars(p, size, max);
      lines.push(...parts.slice(0, -1));
      line = parts[parts.length - 1] ?? '';
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** yaml で配列にした位置では必ず改行する */
function wrap(s: string | string[], size: number, max: number): string[] {
  return (Array.isArray(s) ? s : [s]).flatMap((line) => wrapLine(line, size, max));
}

// ---- アイコン（Material Symbols）と公式ロゴ ----

const iconFiles = import.meta.glob<string>('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true });
// 公式ロゴはファイルを改変せず <image> で読む。無ければ汎用アイコンで代替する
const logoFiles = import.meta.glob<string>('../assets/brand/github/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
});

function iconPath(name: string): string {
  const file = iconFiles[`../assets/icons/${name}.svg`];
  if (!file) throw new Error(`アイコン src/assets/icons/${name}.svg がありません`);
  const d = /<path[^>]*\sd="([^"]+)"/.exec(file)?.[1];
  if (!d || !file.includes('viewBox="0 -960 960 960"')) throw new Error(`アイコン ${name}.svg の形式が想定と違います`);
  return d;
}

const githubLogo = Object.values(logoFiles)[0] ?? null;

// ---- 型 ----

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  what: string;
}

export interface LaidNode {
  id: string;
  tone: Tone;
  cx: number;
  tileX: number;
  tileY: number;
  iconD: string;
  logoUrl: string | null;
  name: { text: string; y: number }[];
  desc: { text: string; y: number }[];
}

export interface LaidGroup {
  id: string;
  tone: Tone;
  title: string;
  note?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  titleY: number;
}

export interface LaidEdge {
  kind: EdgeKind;
  d: string;
  label?: { text: string; x: number; y: number; anchor: 'start' | 'middle' };
}

export interface Diagram {
  width: number;
  height: number;
  tile: number;
  icon: number;
  groups: LaidGroup[];
  nodes: LaidNode[];
  edges: LaidEdge[];
  legend: { kind: EdgeKind; text: string; x: number; y: number }[];
}

// ---- 配置 ----

function layout(data: Architecture): Diagram {
  const nodeLines = (name: string | string[], desc: string | string[] | undefined, w: number) => ({
    name: wrap(name, NAME_SIZE, w),
    desc: desc ? wrap(desc, DESC_SIZE, w) : [],
  });
  const nodeHeight = (l: { name: string[]; desc: string[] }) => TILE + 8 + (l.name.length + l.desc.length) * LINE_H + 4;

  // 段ごとの高さ（左右で高い方に合わせる）
  const rowBody: number[] = [0, 0, 0, 0];
  for (const g of data.groups) {
    const cfg = GROUPS[g.id];
    if (!cfg) throw new Error(`architecture.yaml のグループ ${g.id} の配置がありません`);
    for (const n of g.nodes) {
      rowBody[cfg.row] = Math.max(rowBody[cfg.row]!, nodeHeight(nodeLines(n.name, n.desc, cfg.nodeW)));
    }
  }
  const rowTop: number[] = [];
  const rowH = rowBody.map((b) => HEAD_H + b + PAD_BOTTOM);
  let y = TOP;
  for (const h of rowH) {
    rowTop.push(y);
    y += h + ROW_GAP;
  }
  const rowBottom = (r: number) => rowTop[r]! + rowH[r]!;
  const tileY = (r: number) => rowTop[r]! + HEAD_H;

  const groups: LaidGroup[] = [];
  const nodes: LaidNode[] = [];
  const nodeBottom = new Map<string, number>();
  const nodeRow = new Map<string, number>();
  const groupOf = new Map<string, LaidGroup>();
  const groupNodes = new Map<string, LaidNode[]>();
  const obstacles: Rect[] = [];

  const placeNode = (
    id: string,
    tone: Tone,
    row: number,
    cx: number,
    w: number,
    n: { name: string | string[]; desc?: string | string[]; icon: string; logo?: 'github' },
  ): LaidNode => {
    const lines = nodeLines(n.name, n.desc, w);
    const tY = tileY(row);
    let ly = tY + TILE + 8 + 13;
    const name = lines.name.map((text) => ({ text, y: (ly += LINE_H) - LINE_H }));
    const desc = lines.desc.map((text) => ({ text, y: (ly += LINE_H) - LINE_H }));
    const node: LaidNode = {
      id,
      tone,
      cx,
      tileX: cx - TILE / 2,
      tileY: tY,
      iconD: iconPath(n.icon),
      logoUrl: n.logo === 'github' ? githubLogo : null,
      name,
      desc,
    };
    const textW = Math.max(
      ...lines.name.map((l) => textWidth(l, NAME_SIZE)),
      ...lines.desc.map((l) => textWidth(l, DESC_SIZE)),
    );
    const textTop = tY + TILE + 6;
    const textBottom = textTop + (lines.name.length + lines.desc.length) * LINE_H + 4;
    obstacles.push({ x: node.tileX, y: tY, w: TILE, h: TILE, what: `${id} のタイル` });
    obstacles.push({ x: cx - textW / 2, y: textTop, w: textW, h: textBottom - textTop, what: `${id} の名前・説明` });
    nodeBottom.set(id, textBottom);
    nodeRow.set(id, row);
    nodes.push(node);
    return node;
  };

  for (const g of data.groups) {
    const cfg = GROUPS[g.id]!;
    const lg: LaidGroup = {
      id: g.id,
      tone: g.tone,
      title: g.title,
      note: g.note,
      x: cfg.x,
      y: rowTop[cfg.row]!,
      w: cfg.w,
      h: rowH[cfg.row]!,
      titleY: rowTop[cfg.row]! + 28,
    };
    groups.push(lg);
    groupOf.set(g.id, lg);
    const titleW = textWidth(g.title, TITLE_SIZE) + (g.note ? 10 + textWidth(g.note, DESC_SIZE) : 0);
    obstacles.push({ x: cfg.x + PAD_X, y: lg.y + 12, w: titleW, h: 22, what: `${g.id} の見出し` });

    const slots = Math.max(cfg.slots ?? g.nodes.length, g.nodes.length);
    const inner = cfg.w - PAD_X * 2;
    const gap = slots > 1 ? (inner - slots * cfg.nodeW) / (slots - 1) : 0;
    const placed = g.nodes.map((n, i) => {
      const left = cfg.lefts?.[i] ?? cfg.x + PAD_X + i * (cfg.nodeW + gap);
      if (left < cfg.x + PAD_X - 0.5 || left + cfg.nodeW > cfg.x + cfg.w - PAD_X + 0.5) {
        throw new Error(`architecture: ${n.id} がグループ ${g.id} からはみ出しています`);
      }
      return placeNode(n.id, g.tone, cfg.row, left + cfg.nodeW / 2, cfg.nodeW, n);
    });
    groupNodes.set(g.id, placed);
  }

  const v = data.visitor;
  const visitor = placeNode(v.id, 'outside', VISITOR.row, VISITOR.cx, VISITOR.nodeW, v);

  // ---- 線 ----
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const resolve = (ep: Endpoint) => {
    if (typeof ep === 'string') {
      const node = nodeById.get(ep);
      if (node) return { node, group: null, at: null };
      const group = groupOf.get(ep);
      if (group) return { node: null, group, at: null };
    } else {
      const group = groupOf.get(ep.group);
      const at = nodeById.get(ep.at);
      if (group && at) return { node: null, group, at };
    }
    throw new Error(`architecture.yaml の線の端点 ${JSON.stringify(ep)} が見つかりません`);
  };
  const rowOf = (r: ReturnType<typeof resolve>) =>
    r.node ? nodeRow.get(r.node.id)! : GROUPS[r.group!.id]!.row;
  // 縦に出入りするときの x。グループだけ指定されたときは、出る側は右端のノード、入る側は左端のノードの位置
  const xOf = (r: ReturnType<typeof resolve>, side: 'from' | 'to') => {
    if (r.node) return r.node.cx;
    if (r.at) return r.at.cx;
    const list = groupNodes.get(r.group!.id)!;
    return (side === 'from' ? list[list.length - 1]! : list[0]!).cx;
  };
  const spansCorridor = (x0: number, x1: number) => Math.min(x0, x1) <= CORRIDOR.x0 && Math.max(x0, x1) >= CORRIDOR.x1;
  const labelX = (x0: number, x1: number) => (spansCorridor(x0, x1) ? (CORRIDOR.x0 + CORRIDOR.x1) / 2 : (x0 + x1) / 2);

  const edges: LaidEdge[] = [];
  const segments: { x0: number; y0: number; x1: number; y1: number; edge: string }[] = [];

  for (const e of data.edges) {
    const from = resolve(e.from);
    const to = resolve(e.to);
    const name = `${JSON.stringify(e.from)} → ${JSON.stringify(e.to)}`;
    let pts: [number, number][];
    let label: LaidEdge['label'];

    switch (e.route) {
      case 'h': {
        const r = rowOf(to.node ? to : from);
        const yy = tileY(r) + TILE / 2;
        const x0 = from.node ? from.node.cx + TILE / 2 : from.group!.x + from.group!.w;
        const x1 = to.node ? to.node.cx - TILE / 2 : to.group!.x;
        pts = [
          [x0, yy],
          [x1, yy],
        ];
        if (e.label) {
          label = { text: e.label, x: labelX(x0, x1), y: e.label_side === 'below' ? yy + 20 : yy - 8, anchor: 'middle' };
        }
        break;
      }
      case 'over': {
        if (!from.node || !to.node) throw new Error(`${name}: over はノード同士だけ`);
        pts = [
          [from.node.cx, from.node.tileY],
          [from.node.cx, OVER_Y],
          [to.node.cx, OVER_Y],
          [to.node.cx, to.node.tileY],
        ];
        if (e.label) label = { text: e.label, x: labelX(from.node.cx, to.node.cx), y: OVER_Y - 8, anchor: 'middle' };
        break;
      }
      case 'elbow': {
        const fr = rowOf(from);
        const x0 = xOf(from, 'from');
        const x1 = xOf(to, 'to');
        const y0 = from.node ? nodeBottom.get(from.node.id)! + 4 : rowBottom(fr);
        const y1 = to.node ? to.node.tileY : to.group!.y;
        const mid = rowBottom(fr) + ROW_GAP / 2;
        if (Math.abs(x0 - x1) < 0.5) {
          pts = [
            [x0, y0],
            [x0, y1],
          ];
          if (e.label) label = { text: e.label, x: x0 + 8, y: mid + 5, anchor: 'start' };
        } else {
          pts = [
            [x0, y0],
            [x0, mid],
            [x1, mid],
            [x1, y1],
          ];
          if (e.label) label = { text: e.label, x: labelX(x0, x1), y: mid - 8, anchor: 'middle' };
        }
        break;
      }
      case 'v': {
        const x = xOf(from, 'from');
        const y0 = from.node ? from.node.tileY : from.group!.y;
        const y1 = to.node ? nodeBottom.get(to.node.id)! + 4 : to.group!.y + to.group!.h;
        pts = [
          [x, y0],
          [x, y1],
        ];
        if (e.label) label = { text: e.label, x: x + 8, y: (y0 + y1) / 2 + 5, anchor: 'start' };
        break;
      }
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]!;
      const [x1, y1] = pts[i + 1]!;
      segments.push({ x0, y0, x1, y1, edge: name });
    }
    if (label) {
      const w = textWidth(label.text, LABEL_SIZE);
      const lx = label.anchor === 'middle' ? label.x - w / 2 : label.x;
      obstacles.push({ x: lx, y: label.y - LABEL_SIZE, w, h: LABEL_SIZE + 3, what: `ラベル「${label.text}」` });
    }
    edges.push({ kind: e.kind, d: pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' '), label });
  }

  // ---- 線が見出し・タイル・文字・ラベルをまたがないか検査 ----
  const hits = (s: (typeof segments)[number], r: Rect) => {
    const m = 2; // 端点がタイルの縁に接するのは可
    const sx0 = Math.min(s.x0, s.x1) + (s.x0 === s.x1 ? 0 : m);
    const sx1 = Math.max(s.x0, s.x1) - (s.x0 === s.x1 ? 0 : m);
    const sy0 = Math.min(s.y0, s.y1) + (s.y0 === s.y1 ? 0 : m);
    const sy1 = Math.max(s.y0, s.y1) - (s.y0 === s.y1 ? 0 : m);
    return sx1 >= r.x - 1 && sx0 <= r.x + r.w + 1 && sy1 >= r.y - 1 && sy0 <= r.y + r.h + 1;
  };
  const problems: string[] = [];
  for (const s of segments) {
    for (const r of obstacles) {
      if (hits(s, r)) problems.push(`${s.edge} の線が ${r.what} に重なっています`);
    }
  }
  // 線同士が平行に重ならないか
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i]!;
      const b = segments[j]!;
      const vert = a.x0 === a.x1 && b.x0 === b.x1 && a.x0 === b.x0;
      const horiz = a.y0 === a.y1 && b.y0 === b.y1 && a.y0 === b.y0;
      const overlap = (p0: number, p1: number, q0: number, q1: number) =>
        Math.min(Math.max(p0, p1), Math.max(q0, q1)) - Math.max(Math.min(p0, p1), Math.min(q0, q1)) > 0;
      if ((vert && overlap(a.y0, a.y1, b.y0, b.y1)) || (horiz && overlap(a.x0, a.x1, b.x0, b.x1))) {
        problems.push(`${a.edge} と ${b.edge} の線が重なっています`);
      }
    }
  }
  // ラベル同士・ラベルと文字の重なり
  const labelRects = obstacles.filter((r) => r.what.startsWith('ラベル'));
  for (const l of labelRects) {
    for (const r of obstacles) {
      if (r === l) continue;
      if (l.x < r.x + r.w && l.x + l.w > r.x && l.y < r.y + r.h && l.y + l.h > r.y) {
        problems.push(`${l.what} が ${r.what} に重なっています`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`構成図のレイアウトに問題があります:\n- ${[...new Set(problems)].join('\n- ')}`);

  // ---- 凡例 ----
  const legendY = rowBottom(3) + 44;
  let lx = LEFT.x;
  const legend = (['main', 'sub', 'ops', 'deny'] as const).map((kind) => {
    const item = { kind, text: data.legend[kind], x: lx, y: legendY };
    lx += 44 + textWidth(item.text, LABEL_SIZE) + 32;
    return item;
  });

  void visitor;
  return {
    width: WIDTH,
    height: legendY + 24,
    tile: TILE,
    icon: ICON,
    groups,
    nodes,
    edges,
    legend,
  };
}

export const diagram: Diagram = layout(architecture);
