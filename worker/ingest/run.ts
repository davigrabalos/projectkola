import { cleanup, deactivateMissing, getState, insertFeedCompanies, setState, upsertCompany, upsertJobs } from '../db.ts';
import type { Env } from '../env.ts';
import type { NormalizedJob } from '../normalize.ts';
import { ADZUNA_MARKETS, BOARDS, type AdzunaMarket, type BoardSource } from '../sources.ts';
import { ADZUNA_PAGES, fetchAdzunaPage, mapAdzuna } from './adzuna.ts';
import { fetchGreenhouseList, mapGreenhouse } from './greenhouse.ts';
import { LEVER_PAGE, fetchLeverPage, mapLever } from './lever.ts';

/* Cron ingest. Each run handles a few sources in rotation. With a 15-minute cron and 3 sources per run,
   all 34 boards plus 7 Adzuna markets are refreshed about every 3.5 hours, using 56 Adzuna calls a day (limit 250).
   CPU: parsing and normalising one large board (300+ jobs) takes ~7-10 ms warm and ~50 ms cold (measured
   2026-10-27), so the cron needs the Workers Paid plan (30 s CPU per run); the Free plan's 10 ms per cron run
   is not enough. The site and the API themselves fit the Free plan. */

type Source =
  | { key: string; kind: 'board'; board: BoardSource }
  | { key: string; kind: 'adzuna'; market: AdzunaMarket };

export interface SourceResult {
  source: string;
  fetched?: number;
  kept?: number;
  written?: number;
  closed?: number;
  error?: string;
}

export function sourcesFor(env: Env): Source[] {
  const boards: Source[] = BOARDS.map((board) => ({ key: `${board.kind}:${board.token}`, kind: 'board', board }));
  const adzuna: Source[] = env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY
    ? ADZUNA_MARKETS.map((market) => ({ key: `adzuna:${market.code}`, kind: 'adzuna', market }))
    : [];
  return [...boards, ...adzuna];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ingestBoard(env: Env, b: BoardSource, now: string): Promise<SourceResult> {
  const db = env.DB;
  const key = `${b.kind}:${b.token}`;
  await upsertCompany(db, b.company, now);

  if (b.kind === 'greenhouse') {
    const list = await fetchGreenhouseList(b.token);
    const jobs = mapGreenhouse(b, list);
    const { written } = await upsertJobs(db, jobs, now);
    const closed = await deactivateMissing(db, 'greenhouse', b.company.id, new Set(jobs.map((j) => j.id)), now);
    return { source: key, fetched: list.jobs.length, kept: jobs.length, written, closed };
  }

  // Lever: one page per run; jobs missing from a full pass are closed when the last page arrives.
  const state = (await getState<{ skip: number; seen: string[] }>(db, `lever:${b.token}`)) ?? { skip: 0, seen: [] };
  const page = await fetchLeverPage(b.token, state.skip);
  const jobs = mapLever(b, page);
  const { written } = await upsertJobs(db, jobs, now);
  const seen = [...state.seen, ...jobs.map((j) => j.id)];
  let closed = 0;
  if (page.length < LEVER_PAGE) {
    closed = await deactivateMissing(db, 'lever', b.company.id, new Set(seen), now);
    await setState(db, `lever:${b.token}`, { skip: 0, seen: [] }, now);
  } else {
    await setState(db, `lever:${b.token}`, { skip: state.skip + LEVER_PAGE, seen }, now);
  }
  return { source: key, fetched: page.length, kept: jobs.length, written, closed };
}

async function ingestAdzuna(env: Env, m: AdzunaMarket, now: string): Promise<SourceResult> {
  const db = env.DB;
  const key = `adzuna:${m.code}`;
  const page = ((await getState<number>(db, key)) ?? 0) % ADZUNA_PAGES + 1;
  const data = await fetchAdzunaPage(m, page, env.ADZUNA_APP_ID!, env.ADZUNA_APP_KEY!);
  const jobs: NormalizedJob[] = mapAdzuna(m, data);
  await insertFeedCompanies(db, jobs.map((j) => ({ id: j.companyId, name: j.companyName })), now);
  const { written } = await upsertJobs(db, jobs, now);
  await setState(db, key, page, now);
  return { source: `${key}#${page}`, fetched: data.results?.length ?? 0, kept: jobs.length, written };
}

export async function runIngest(env: Env, at = new Date()): Promise<SourceResult[]> {
  const db = env.DB;
  const now = at.toISOString();
  const sources = sourcesFor(env);
  const perRun = Math.min(Math.max(Number(env.INGEST_PER_RUN) || 3, 1), 10);
  const start = ((await getState<number>(db, 'rotation')) ?? 0) % sources.length;

  const results: SourceResult[] = [];
  let lastWasLever = false;
  for (let i = 0; i < Math.min(perRun, sources.length); i++) {
    const src = sources[(start + i) % sources.length];
    const isLever = src.kind === 'board' && src.board.kind === 'lever';
    if (isLever && lastWasLever) await sleep(1000); // Lever's robots.txt crawl delay
    lastWasLever = isLever;
    try {
      results.push(src.kind === 'board' ? await ingestBoard(env, src.board, now) : await ingestAdzuna(env, src.market, now));
    } catch (e) {
      // One failing source never blocks the others; it is retried on its next turn.
      results.push({ source: src.key, error: String(e instanceof Error ? e.message : e) });
    }
  }

  await setState(db, 'rotation', (start + perRun) % sources.length, now);
  await cleanup(db, at);
  await setState(db, 'last_run', { at: now, results }, now);
  console.log(JSON.stringify({ ingest: results }));
  return results;
}
