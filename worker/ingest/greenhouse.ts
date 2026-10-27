import { extractSkills } from '../../src/lib/skills.ts';
import { inferCategory, inferEmploymentType, inferExperience, inferWorkMode, marketOf, type NormalizedJob } from '../normalize.ts';
import type { BoardSource } from '../sources.ts';
import { getJson } from './http.ts';

/* Greenhouse public Job Board API (no key). The list call is light (no descriptions);
   the description and pay ranges are fetched per job the first time someone opens it (see detail.ts). */

export interface GreenhouseListJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  first_published?: string | null;
  location?: { name?: string | null } | null;
  metadata?: { name?: string; value?: unknown }[] | null;
}

const metaText = (m: GreenhouseListJob['metadata']) =>
  (m ?? []).map((x) => (typeof x.value === 'string' ? x.value : Array.isArray(x.value) ? x.value.join(' ') : '')).join(' ');

export function mapGreenhouse(src: BoardSource, list: { jobs: GreenhouseListJob[] }): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  for (const j of list.jobs ?? []) {
    const location = (j.location?.name ?? '').trim();
    const meta = metaText(j.metadata);
    const workMode = inferWorkMode(location, j.title);
    // "Remote" with a Region: EMEA tag still counts as Europe.
    const country = marketOf(location) ?? (workMode === 'remote' && /\b(emea|europe)\b/i.test(meta) ? 'EU' : null);
    if (!country) continue;
    out.push({
      id: `gh-${j.id}`,
      provider: 'greenhouse',
      externalId: String(j.id),
      boardToken: src.token,
      companyId: src.company.id,
      companyName: src.company.name,
      title: j.title.trim(),
      category: inferCategory(meta, j.title),
      location,
      country,
      workMode,
      employmentType: inferEmploymentType(j.title),
      experience: inferExperience(j.title),
      salary: null,
      postedAt: new Date(j.first_published ?? j.updated_at).toISOString(),
      applyUrl: j.absolute_url,
      sourceUrl: j.absolute_url,
      summary: '',
      skills: extractSkills(j.title),
    });
  }
  return out;
}

export const fetchGreenhouseList = (token: string) =>
  getJson<{ jobs: GreenhouseListJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`);

export interface GreenhouseJobDetail {
  content?: string;
  pay_input_ranges?: { min_cents: number; max_cents: number; currency_type: string }[];
}

export const fetchGreenhouseJob = (token: string, id: string) =>
  getJson<GreenhouseJobDetail>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}?pay_transparency=true`);
