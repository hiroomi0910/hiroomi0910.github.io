// Lighthouse CI の結果（.lighthouseci/reports/manifest.json）から、ページごとの点数（代表値）を Markdown の表で出す。
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('.lighthouseci/reports/manifest.json', 'utf8'));
const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) : '-');
const rows = manifest
  .filter((run) => run.isRepresentativeRun)
  .map((run) => {
    const s = run.summary;
    return `| ${new URL(run.url).pathname} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} |`;
  });
console.log(['| ページ | Performance | Accessibility | Best Practices |', '|---|---|---|---|', ...rows].join('\n'));
