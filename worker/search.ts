/* Search helpers shared by the API and its tests. */

/**
 * FTS5 query from what someone typed: up to 6 words, accents removed, each quoted so no FTS operators
 * can be injected. Words match by stem (the index uses the Porter stemmer). Only a short last word
 * (3 letters or fewer, probably still being typed) matches as a prefix: "eng" finds "engineer".
 */
export function ftsQuery(q: string): string {
  const terms = q.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 6);
  return terms.map((t, i) => (i === terms.length - 1 && t.length <= 3 ? `"${t}"*` : `"${t}"`)).join(' ');
}
