import { useCallback, useState } from 'react';
import { api, keys, PAGE_SIZE } from '../lib/api';
import { prefetch, useSWR } from '../lib/swr';
import type { JobFilters } from '../lib/filter-params';
import type { Job } from '../data/types';

/* Every job seen in a list, by id: opening one renders at once from here while its full description loads. */
const seen = new Map<string, Job>();
const remember = (jobs: Job[]) => { for (const j of jobs) if (!seen.get(j.id)?.descriptionHtml) seen.set(j.id, j); return jobs; };

export const useMeta = () => useSWR(keys.meta, api.meta);
export const useCompanies = () => useSWR(keys.companies, api.listCompanies);
export const useCompany = (id: string) => useSWR(id ? keys.company(id) : null, () => api.getCompany(id).then((r) => (r && remember(r.jobs), r)));

/**
 * A filtered job list with "load more". The first page goes through the cache (instant back/forward,
 * refreshed in the background); later pages are appended here and reset whenever the filters change.
 */
export function useJobList(filters: Partial<JobFilters>, limit = PAGE_SIZE, enabled = true) {
  const key = keys.jobs(filters, limit);
  const first = useSWR(enabled ? key : null, () => api.listJobs(filters, '', limit).then((p) => (remember(p.jobs), p)));
  const [more, setMore] = useState<{ key: string; jobs: Job[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  const extra = more?.key === key ? more : null;
  const cursor = extra ? extra.cursor : first.data?.nextCursor ?? null;

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await api.listJobs(filters, cursor, limit);
      remember(page.jobs);
      setMore({ key, jobs: [...(extra?.jobs ?? []), ...page.jobs], cursor: page.nextCursor });
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, filters, limit, key, extra]);

  const firstJobs = first.data?.jobs ?? [];
  const ids = new Set(firstJobs.map((j) => j.id));
  const jobs = [...firstJobs, ...(extra?.jobs ?? []).filter((j) => !ids.has(j.id))];
  return { ...first, jobs, total: first.data?.total, hasMore: Boolean(cursor), loadMore, loadingMore, moreError };
}

/** Saved jobs by id; closed jobs are missing from the result. */
export const useJobsByIds = (ids: string[]) =>
  useSWR(ids.length ? keys.jobsByIds(ids) : null, () => api.jobsByIds(ids).then(remember));

/**
 * One job with its full description. If the job was in a list, it renders at once from there
 * (`isLoading` false) and `isValidating` stays true until the description arrives.
 */
export function useJob(id: string | null | undefined) {
  const res = useSWR(id ? keys.job(id) : null, () => api.getJob(id!));
  const fromList = id ? seen.get(id) : undefined;
  const data = res.data ?? fromList;
  return { ...res, data, isLoading: res.isLoading && !fromList, descriptionPending: !res.data && !res.error && Boolean(id) };
}

export const prefetchJob = (id: string) => prefetch(keys.job(id), () => api.getJob(id));
