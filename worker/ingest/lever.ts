import { extractSkills } from '../../src/lib/skills.ts';
import type { WorkMode } from '../../src/data/types.ts';
import { htmlToText, inferCategory, inferEmploymentType, inferExperience, inferWorkMode, marketOf, summarize, type NormalizedJob } from '../normalize.ts';
import type { BoardSource } from '../sources.ts';
import { getJson } from './http.ts';

/* Lever public Postings API (no key). Read in pages (limit/skip) so each cron run stays small;
   Lever asks crawlers for a 1 second delay, which the rotation easily respects. */

export const LEVER_PAGE = 50;

export interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt: number;
  country?: string | null;
  workplaceType?: string | null;
  categories?: { commitment?: string; department?: string; location?: string; team?: string; allLocations?: string[] } | null;
  descriptionPlain?: string;
  description?: string;
  lists?: { text?: string; content?: string }[];
  additional?: string;
}

const WORKPLACE: Record<string, WorkMode> = { remote: 'remote', hybrid: 'hybrid', 'on-site': 'on-site', onsite: 'on-site' };

export function mapLever(src: BoardSource, postings: LeverPosting[]): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  for (const p of postings ?? []) {
    const c = p.categories ?? {};
    const location = (c.location ?? (c.allLocations ?? []).join(' / ')).trim();
    const country = marketOf([location, ...(c.allLocations ?? [])].join(' '), p.country ?? undefined);
    if (!country) continue;
    const text = [p.descriptionPlain ?? '', ...(p.lists ?? []).map((l) => `${l.text ?? ''} ${htmlToText(l.content ?? '')}`)].join(' ');
    out.push({
      id: `lv-${p.id}`,
      provider: 'lever',
      externalId: p.id,
      boardToken: src.token,
      companyId: src.company.id,
      companyName: src.company.name,
      title: p.text.trim(),
      category: inferCategory(c.department, c.team, p.text),
      location,
      country,
      workMode: WORKPLACE[p.workplaceType ?? ''] ?? inferWorkMode(location, p.text),
      employmentType: inferEmploymentType(c.commitment, p.text),
      experience: inferExperience(p.text),
      salary: null,
      postedAt: new Date(p.createdAt).toISOString(),
      applyUrl: p.applyUrl ?? p.hostedUrl,
      sourceUrl: p.hostedUrl,
      summary: summarize(p.descriptionPlain ?? ''),
      skills: extractSkills(`${p.text} ${text}`),
    });
  }
  return out;
}

export const fetchLeverPage = (token: string, skip: number) =>
  getJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json&limit=${LEVER_PAGE}&skip=${skip}`);

export const fetchLeverPosting = (token: string, id: string) =>
  getJson<LeverPosting>(`https://api.lever.co/v0/postings/${encodeURIComponent(token)}/${encodeURIComponent(id)}?mode=json`);
