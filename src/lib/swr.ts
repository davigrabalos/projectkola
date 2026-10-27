import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Tiny stale-while-revalidate cache (no library needed).
 * - Cached data is returned instantly; a background refetch then updates it.
 * - Refetches when the tab becomes visible again, the window regains focus, or the network returns.
 * - Requests for the same key are de-duplicated.
 * Use only for data where a few seconds of staleness is harmless (job listings, companies),
 * never for balances, stock counts or anything where old data costs money.
 */

interface Entry<T> {
  data?: T;
  error?: unknown;
  promise?: Promise<T>;
  updatedAt: number;
}

const cache = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const DEDUPE_MS = 2000;

function set<T>(key: string, patch: Partial<Entry<T>>) {
  // Replace (not mutate) so useSyncExternalStore sees a new snapshot.
  cache.set(key, { updatedAt: 0, ...cache.get(key), ...patch });
  listeners.get(key)?.forEach((l) => l());
}

/** Read whatever is cached for a key, without fetching. */
export function peek<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

/** Fetch into the cache unless a fresh copy or an in-flight request already exists. */
export function revalidate<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> | undefined {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (entry?.promise) return entry.promise;
  if (!force && entry && Date.now() - entry.updatedAt < DEDUPE_MS) return undefined;

  const promise = fetcher().then(
    (data) => { set<T>(key, { data, error: undefined, promise: undefined, updatedAt: Date.now() }); return data; },
    (error) => { set<T>(key, { error, promise: undefined }); throw error; },
  );
  promise.catch(() => { /* surfaced through the hook's `error` */ });
  set<T>(key, { promise });
  return promise;
}

/** Warm the cache ahead of navigation (used on hover/focus of links). */
export const prefetch = <T,>(key: string, fetcher: () => Promise<T>) => { revalidate(key, fetcher); };

export function useSWR<T>(key: string | null, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback((notify: () => void) => {
    if (!key) return () => {};
    const subs = listeners.get(key) ?? new Set();
    listeners.set(key, subs);
    subs.add(notify);
    return () => { subs.delete(notify); };
  }, [key]);

  const entry = useSyncExternalStore(subscribe, () => (key ? (cache.get(key) as Entry<T> | undefined) : undefined));

  useEffect(() => {
    if (!key) return;
    const run = () => revalidate(key, () => fetcherRef.current());
    run();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);

  const retry = useCallback(() => { if (key) revalidate(key, () => fetcherRef.current(), true); }, [key]);

  return {
    data: entry?.data,
    error: entry?.error,
    /** True only when there is nothing to show yet. */
    isLoading: !!key && entry?.data === undefined && !entry?.error,
    /** True while a background refresh is running. */
    isValidating: !!entry?.promise,
    retry,
  };
}
