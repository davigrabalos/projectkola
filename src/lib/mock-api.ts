import { jobs } from '../data/jobs';
import { companies } from '../data/companies';
import type { Company, Job } from '../data/types';
import { filterJobs } from './filters';
import { parseFilters, serializeFilters, type JobFilters } from './filter-params';
import type { ApplicationPayload, CompanyWithJobs, JobPage, Meta } from './api';

/**
 * Mock API (VITE_USE_MOCK=1): the bundled fixtures, answered with realistic latency so loading states,
 * caching and paging behave as they do against the real backend. Same shapes as worker/api.ts.
 */
export const MOCK_LATENCY_MS = 600;

const respond = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS * (0.7 + Math.random() * 0.6)));

const companyById = new Map(companies.map((c) => [c.id, c]));
/** Like the API, every job carries its company's id and name. */
const withCompany = (j: Job): Job => ({ ...j, company: { id: j.companyId, name: companyById.get(j.companyId)?.name ?? '' } });
const all = jobs.map(withCompany);

export function listJobs(f: Partial<JobFilters>, cursor: string, limit: number): Promise<JobPage> {
  const results = filterJobs(all, parseFilters(serializeFilters(f)));
  const offset = cursor ? Number.parseInt(cursor, 36) || 0 : 0;
  const page = results.slice(offset, offset + limit);
  return respond({ jobs: page, total: results.length, nextCursor: offset + page.length < results.length ? (offset + limit).toString(36) : null });
}

export const jobsByIds = (ids: string[]) => respond(all.filter((j) => ids.includes(j.id)));
export const getJob = (id: string) => respond(all.find((j) => j.id === id) ?? null);

const openJobs = (id: string) => all.filter((j) => j.companyId === id).length;
export const listCompanies = (): Promise<Company[]> => respond(companies.map((c) => ({ ...c, curated: true, openJobs: openJobs(c.id) })));

export function getCompany(id: string): Promise<CompanyWithJobs | null> {
  const c = companyById.get(id);
  return respond(c ? { company: { ...c, curated: true, openJobs: openJobs(id) }, jobs: all.filter((j) => j.companyId === id) } : null);
}

export function meta(): Promise<Meta> {
  const counts = new Map<string, number>();
  for (const j of all) counts.set(j.category, (counts.get(j.category) ?? 0) + 1);
  return respond({
    categories: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    total: all.length,
    remote: all.filter((j) => j.workMode === 'remote').length,
    companies: companies.length,
    easyApply: all.filter((j) => j.easyApply).length,
    lastIngestAt: null,
  });
}

/**
 * Mock of the server's idempotency store: the same key always returns the first result,
 * so a retried or double-sent request can never create a second application.
 */
const applicationsByKey = new Map<string, { applicationId: string }>();

export function submitApplication(payload: ApplicationPayload, idempotencyKey: string) {
  const existing = applicationsByKey.get(idempotencyKey);
  if (existing) return respond(existing);
  const created = { applicationId: `app_${payload.jobId}_${applicationsByKey.size + 1}` };
  applicationsByKey.set(idempotencyKey, created);
  return respond(created);
}
