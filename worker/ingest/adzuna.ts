import { extractSkills } from '../../src/lib/skills.ts';
import { htmlToText, inferCategory, inferEmploymentType, inferExperience, inferWorkMode, slug, summarize, type NormalizedJob } from '../normalize.ts';
import type { AdzunaMarket } from '../sources.ts';
import { getJson } from './http.ts';

/* Adzuna search API (free key; terms: every Adzuna job shows a "Jobs by Adzuna" label linking back,
   and applying goes through Adzuna's redirect_url). Predicted salaries are dropped: showing them
   would need the separate "Adzuna Jobsworth" label. */

export const ADZUNA_PAGES = 3;

export interface AdzunaResult {
  id: string;
  title: string;
  description?: string;
  created: string;
  redirect_url: string;
  company?: { display_name?: string } | null;
  location?: { display_name?: string } | null;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
  contract_type?: string;
  contract_time?: string;
  category?: { label?: string; tag?: string } | null;
}

export function mapAdzuna(market: AdzunaMarket, data: { results?: AdzunaResult[] }): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  for (const r of data.results ?? []) {
    const companyName = r.company?.display_name?.trim();
    if (!companyName || !r.redirect_url) continue;
    const title = htmlToText(r.title);
    const snippet = htmlToText(r.description ?? '');
    const location = r.location?.display_name?.trim() ?? '';
    const predicted = String(r.salary_is_predicted ?? '0') === '1';
    const min = r.salary_min ?? r.salary_max;
    const max = r.salary_max ?? r.salary_min;
    const contract = r.contract_time === 'part_time' ? 'part-time' : r.contract_type === 'contract' ? 'contract' : undefined;
    out.push({
      id: `az-${r.id}`,
      provider: 'adzuna',
      externalId: String(r.id),
      boardToken: '',
      companyId: `az-${slug(companyName)}`,
      companyName,
      title,
      category: inferCategory(r.category?.label, title),
      location,
      country: market.country,
      workMode: inferWorkMode(title, location, snippet),
      employmentType: inferEmploymentType(title, contract),
      experience: inferExperience(title),
      salary: !predicted && min && max ? { min: Math.round(min), max: Math.round(max), currency: market.currency, period: 'year' } : null,
      postedAt: new Date(r.created).toISOString(),
      applyUrl: r.redirect_url,
      sourceUrl: r.redirect_url,
      summary: summarize(snippet),
      skills: extractSkills(`${title} ${snippet}`),
    });
  }
  return out;
}

export const fetchAdzunaPage = (market: AdzunaMarket, page: number, appId: string, appKey: string) =>
  getJson<{ results?: AdzunaResult[] }>(
    `https://api.adzuna.com/v1/api/jobs/${market.code}/search/${page}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
      '&results_per_page=50&max_days_old=14&sort_by=date&content-type=application/json',
  );
