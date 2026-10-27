import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'kola:saved-jobs';

interface SavedJobsValue {
  saved: string[];
  isSaved: (id: string) => boolean;
  save: (id: string) => void;
  /** Removes a job and returns its old position, so it can be restored in place. */
  remove: (id: string) => number;
  /** Puts a removed job back where it was (used by Undo). */
  restore: (id: string, index: number) => void;
}

const SavedJobsContext = createContext<SavedJobsValue | null>(null);

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage unavailable */ }
  }, [saved]);

  const save = useCallback((id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  }, []);

  const remove = useCallback((id: string) => {
    const index = saved.indexOf(id);
    setSaved((prev) => prev.filter((x) => x !== id));
    return index;
  }, [saved]);

  const restore = useCallback((id: string, index: number) => {
    setSaved((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ saved, save, remove, restore, isSaved: (id: string) => saved.includes(id) }), [saved, save, remove, restore]);
  return <SavedJobsContext.Provider value={value}>{children}</SavedJobsContext.Provider>;
}

export function useSavedJobs() {
  const ctx = useContext(SavedJobsContext);
  if (!ctx) throw new Error('useSavedJobs must be used inside SavedJobsProvider');
  return ctx;
}
