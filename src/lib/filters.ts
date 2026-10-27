import type { Job } from '../data/types';
import { annualised } from './format';

export { parseFilters, serializeFilters, type JobFilters, type PostedWithin, type SortKey } from './filter-params';
import type { JobFilters } from './filter-params';

export function countActiveFilters(f: JobFilters) {
  return f.workMode.length + f.type.length + f.level.length + (f.posted ? 1 : 0) + (f.easyApply ? 1 : 0) + (f.category ? 1 : 0);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function score(job: Job, q: string) {
  if (!q) return 1;
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const company = job.company?.name ?? '';
  let s = 0;
  for (const t of terms) {
    if (norm(job.title).includes(t)) s += 3;
    else if (norm(company).includes(t)) s += 2;
    else if (job.skills.some((k) => norm(k).includes(t)) || norm(job.category).includes(t)) s += 1;
    else return 0; // every term must match somewhere
  }
  return s;
}

export function filterJobs(all: Job[], f: JobFilters): Job[] {
  const where = norm(f.where.trim());
  const now = Date.now();
  const results = all
    .map((job) => ({ job, s: score(job, f.q) }))
    .filter(({ job, s }) => {
      if (s === 0) return false;
      if (where) {
        const remoteSearch = where.includes('remote');
        if (remoteSearch ? job.workMode !== 'remote' : !norm(job.location).includes(where)) return false;
      }
      if (f.category && job.category !== f.category) return false;
      if (f.workMode.length && !f.workMode.includes(job.workMode)) return false;
      if (f.type.length && !f.type.includes(job.employmentType)) return false;
      if (f.level.length && !f.level.includes(job.experience)) return false;
      if (f.easyApply && !job.easyApply) return false;
      if (f.posted && now - new Date(job.postedAt).getTime() > Number(f.posted) * 86_400_000) return false;
      return true;
    });

  results.sort((a, b) => {
    if (f.sort === 'recent') return b.job.postedAt.localeCompare(a.job.postedAt);
    if (f.sort === 'salary') return annualised(b.job.salary) - annualised(a.job.salary);
    return b.s - a.s || b.job.postedAt.localeCompare(a.job.postedAt);
  });
  return results.map((r) => r.job);
}
