import { useSyncExternalStore } from 'react';

/* Jobs the user says they applied to on the employer's site (this device only). Kola can't see those
   applications, so it asks "Did you apply?" when the user comes back to the tab. */

const KEY = 'kola:applied';
type Store = Record<string, string>; // job id -> ISO date

function load(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; }
}

let store = load();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function markApplied(id: string, applied = true) {
  store = { ...store };
  if (applied) store[id] = new Date().toISOString();
  else delete store[id];
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

/** When the user applied to this job, or undefined. */
export const useAppliedAt = (id: string) => useSyncExternalStore(subscribe, () => store[id]);
