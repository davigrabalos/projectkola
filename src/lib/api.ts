import type { Company, Job } from '../data/types';
import { serializeFilters, type JobFilters } from './filter-params';

/**
 * Client for the Kola API. For now the app runs on mock data by default: src/lib/mock-api.ts answers from
 * src/data (real postings snapshotted by `npm run mock:refresh`), with realistic latency.
 * With VITE_USE_API=1 it calls the Worker's JSON API instead (worker/api.ts, same origin under /api);
 * the mock module is then never loaded.
 */

export interface JobPage { jobs: Job[]; nextCursor: string | null; total: number }
export interface Meta {
  categories: { name: string; count: number }[];
  total: number;
  remote: number;
  companies: number;
  /** Jobs with in-app easy apply. Real jobs are applied for on the employer's site, so this is 0 there. */
  easyApply: number;
  lastIngestAt: string | null;
}
export interface CompanyWithJobs { company: Company; jobs: Job[] }

export interface ApplicationPayload {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  cover?: string;
  cvFileName?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const USE_MOCK = import.meta.env.VITE_USE_API !== '1';
const mock = () => import('./mock-api');

export const PAGE_SIZE = 20;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const orNull = <T,>(p: Promise<T>) => p.catch((e) => { if (e instanceof ApiError && e.status === 404) return null; throw e; });

const listQuery = (f: Partial<JobFilters>, cursor: string, limit: number) => {
  const p = serializeFilters(f);
  if (cursor) p.set('cursor', cursor);
  p.set('limit', String(limit));
  return p.toString();
};

export const keys = {
  jobs: (f: Partial<JobFilters>, limit = PAGE_SIZE) => `jobs?${listQuery(f, '', limit)}`,
  jobsByIds: (ids: string[]) => `jobs-by-id:${[...ids].sort().join(',')}`,
  job: (id: string) => `job:${id}`,
  companies: 'companies',
  company: (id: string) => `company:${id}`,
  meta: 'meta',
};

export const api = {
  listJobs: (f: Partial<JobFilters>, cursor = '', limit = PAGE_SIZE): Promise<JobPage> =>
    USE_MOCK ? mock().then((m) => m.listJobs(f, cursor, limit)) : getJson(`/api/jobs?${listQuery(f, cursor, limit)}`),
  /** Saved jobs. Closed jobs are simply missing from the result. */
  jobsByIds: (ids: string[]): Promise<Job[]> =>
    !ids.length ? Promise.resolve([])
      : USE_MOCK ? mock().then((m) => m.jobsByIds(ids))
      : getJson<JobPage>(`/api/jobs?ids=${ids.slice(0, 50).map(encodeURIComponent).join(',')}&limit=50`).then((p) => p.jobs),
  getJob: (id: string): Promise<Job | null> =>
    USE_MOCK ? mock().then((m) => m.getJob(id)) : orNull(getJson<Job>(`/api/jobs/${encodeURIComponent(id)}`)),
  listCompanies: (): Promise<Company[]> => (USE_MOCK ? mock().then((m) => m.listCompanies()) : getJson('/api/companies')),
  getCompany: (id: string): Promise<CompanyWithJobs | null> =>
    USE_MOCK ? mock().then((m) => m.getCompany(id)) : orNull(getJson<CompanyWithJobs>(`/api/companies/${encodeURIComponent(id)}`)),
  meta: (): Promise<Meta> => (USE_MOCK ? mock().then((m) => m.meta()) : getJson('/api/meta')),

  /**
   * In-app application, for jobs with easy apply (mock data only for now). Real jobs are applied for on the
   * employer's site (job.applyUrl). A real endpoint would be:
   *   fetch('/api/applications', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body })
   * sending the SAME key on every retry of one application.
   */
  submitApplication: (payload: ApplicationPayload, idempotencyKey: string): Promise<{ applicationId: string }> =>
    mock().then((m) => m.submitApplication(payload, idempotencyKey)),
};
