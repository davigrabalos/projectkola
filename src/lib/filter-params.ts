import type { EmploymentType, ExperienceLevel, WorkMode } from '../data/types';

/* Job search parameters, shared by the app (URL state) and the API (/api/jobs query string).
   No dependencies on purpose: the Worker imports this file too. */

export type SortKey = 'relevance' | 'recent' | 'salary';
export type PostedWithin = '' | '1' | '7' | '30';

export interface JobFilters {
  q: string;
  where: string;
  category: string;
  workMode: WorkMode[];
  type: EmploymentType[];
  level: ExperienceLevel[];
  posted: PostedWithin;
  easyApply: boolean;
  sort: SortKey;
}

const list = <T extends string>(p: URLSearchParams, k: string) =>
  (p.get(k)?.split(',').filter(Boolean) ?? []) as T[];

/** Filters live in the URL so searches are shareable, bookmarkable and survive back/forward. */
export function parseFilters(p: URLSearchParams): JobFilters {
  return {
    q: p.get('q') ?? '',
    where: p.get('where') ?? '',
    category: p.get('category') ?? '',
    workMode: list<WorkMode>(p, 'mode'),
    type: list<EmploymentType>(p, 'type'),
    level: list<ExperienceLevel>(p, 'level'),
    posted: (p.get('posted') ?? '') as PostedWithin,
    easyApply: p.get('easy') === '1',
    sort: (p.get('sort') as SortKey) || 'relevance',
  };
}

export function serializeFilters(f: Partial<JobFilters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.where) p.set('where', f.where);
  if (f.category) p.set('category', f.category);
  if (f.workMode?.length) p.set('mode', f.workMode.join(','));
  if (f.type?.length) p.set('type', f.type.join(','));
  if (f.level?.length) p.set('level', f.level.join(','));
  if (f.posted) p.set('posted', f.posted);
  if (f.easyApply) p.set('easy', '1');
  if (f.sort && f.sort !== 'relevance') p.set('sort', f.sort);
  return p;
}
