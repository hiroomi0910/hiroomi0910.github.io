// content/*.yaml を読み込み、zod で検証して型付きで返す。
// 必須項目が欠けている・型が違うときは例外を投げてビルドを失敗させる。
// `[要確認` を含む値は表示せず、ビルド時に警告を出す。
import { parse } from 'yaml';
import { z } from 'zod';
import personalProjectsYaml from '../../content/personal-projects.yaml?raw';
import profileYaml from '../../content/profile.yaml?raw';
import projectsYaml from '../../content/projects.yaml?raw';
import siteYaml from '../../content/site.yaml?raw';
import skillsYaml from '../../content/skills.yaml?raw';
import timelineYaml from '../../content/timeline.yaml?raw';

const PENDING_MARK = '[要確認';

const text = z.string().trim().min(1);
const url = z.url();

const linkSchema = z.object({ label: text, url });

export const profileSchema = z.object({
  name: text,
  role: text,
  role_ja: text,
  tagline_serif: text,
  lead: text,
  location: text,
  work_style: text,
  specialties: z.array(text).min(1),
  years_on_web: z.number().int().positive(),
  about: text,
  strengths: z.array(z.object({ title: text, body: text })).min(1),
});

export const skillsSchema = z.object({
  groups: z.array(z.object({ label: text, items: z.array(text).min(1) })).min(1),
  certifications: z.array(text).default([]),
});

export const projectsSchema = z
  .array(
    z.object({
      title: text,
      period: text,
      role: text,
      team: text.optional(),
      tech: z.array(text).default([]),
      phases: z.array(text).default([]),
      summary: text,
      highlights: z.array(text).default([]),
    }),
  )
  .min(1);

export const timelineSchema = z
  .array(z.object({ period: text, summary: text, tech: z.array(text).default([]) }))
  .min(1);

export const personalProjectsSchema = z
  .array(
    z.object({
      title: text,
      kind: text,
      status: text,
      summary: text,
      tech: z.array(text).default([]),
      links: z.array(linkSchema).default([]),
    }),
  )
  .min(1);

export const siteSchema = z.object({
  display_name: text,
  brand: text,
  copyright_year: z.number().int(),
  links: z.object({
    github: url,
    qiita: url,
    vscode_extension: z.object({ marketplace: url, open_vsx: url }),
    linkedin: url.nullable().default(null),
    photography: url,
  }),
  contact: z.object({
    form_url: url.nullable().default(null),
    email: z
      .object({
        user: text,
        domain: text,
      })
      .nullable()
      .default(null),
  }),
  entrance: z.object({
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    photo: z.object({
      source: z.literal('cloudinary'),
      folder: text,
      tag: text.nullable().default(null),
      min_aspect: z.number().positive(),
      watermark: text.nullable().default(null),
      alt_fallback: text,
    }),
  }),
});

export type Profile = z.infer<typeof profileSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Project = z.infer<typeof projectsSchema>[number];
export type TimelineEntry = z.infer<typeof timelineSchema>[number];
export type PersonalProject = z.infer<typeof personalProjectsSchema>[number];
export type Site = z.infer<typeof siteSchema>;

const warned = new Set<string>();
function warnPending(file: string, path: string): void {
  const key = `${file}:${path}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[content] ${file} の ${path} に「[要確認]」が残っています。この項目は表示しません。`);
}

/**
 * `[要確認` を含む値を取り除く。
 * - 配列の中の文字列は要素ごと除く
 * - オブジェクトのフィールドはフィールドごと除く（必須項目なら検証でビルドが失敗する）
 */
function stripPending(value: unknown, file: string, path: string): unknown {
  if (typeof value === 'string' && value.includes(PENDING_MARK)) {
    warnPending(file, path);
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item, i) => stripPending(item, file, `${path}[${i}]`))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const stripped = stripPending(v, file, path ? `${path}.${k}` : k);
      if (stripped !== undefined) out[k] = stripped;
    }
    return out;
  }
  return value;
}

function load<T extends z.ZodType>(file: string, source: string, schema: T): z.infer<T> {
  const raw: unknown = parse(source);
  const result = schema.safeParse(stripPending(raw, file, ''));
  if (!result.success) {
    throw new Error(`content/${file} の内容が不正です:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const profile: Profile = load('profile.yaml', profileYaml, profileSchema);
export const skills: Skills = load('skills.yaml', skillsYaml, skillsSchema);
export const projects: Project[] = load('projects.yaml', projectsYaml, projectsSchema);
export const timeline: TimelineEntry[] = load('timeline.yaml', timelineYaml, timelineSchema);
export const personalProjects: PersonalProject[] = load('personal-projects.yaml', personalProjectsYaml, personalProjectsSchema);
export const site: Site = load('site.yaml', siteYaml, siteSchema);
