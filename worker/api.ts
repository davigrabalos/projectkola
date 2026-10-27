import { parseFilters } from '../src/lib/filter-params.ts';
import type { EmploymentType, ExperienceLevel, WorkMode } from '../src/data/types.ts';
import { LIST_COLUMNS, rowToCompany, rowToJob, type CompanyRow, type JobRow } from './db.ts';
import type { Env } from './env.ts';
import { withDescription } from './ingest/detail.ts';
import { runIngest } from './ingest/run.ts';
import { foldText } from './normalize.ts';
import { ftsQuery } from './search.ts';

/* JSON API under /api. Read-only except the token-guarded admin ingest trigger. */

const WORK_MODES: WorkMode[] = ['remote', 'hybrid', 'on-site'];
const TYPES: EmploymentType[] = ['full-time', 'part-time', 'contract', 'internship'];
const LEVELS: ExperienceLevel[] = ['entry', 'mid', 'senior', 'lead'];
const POSTED = new Set(['', '1', '7', '30']);
const DAY = 86_400_000;
const JOB_ID = /^(gh|lv|az)-[\w-]{1,80}$/;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extra },
  });

/** Edge cache for public GETs (Cache API + Cache-Control). TTL 0 disables it (local dev). */
async function cached(req: Request, env: Env, ctx: ExecutionContext, make: () => Promise<Response>) {
  const ttl = Number(env.CACHE_TTL ?? 60);
  if (!ttl) return make();
  const cache = caches.default;
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await make();
  if (res.status === 200) {
    res.headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 10}`);
    ctx.waitUntil(cache.put(req, res.clone()));
  }
  return res;
}

const text = (v: string, max: number) => v.trim().slice(0, max);

async function listJobs(url: URL, env: Env) {
  const f = parseFilters(url.searchParams);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '', 10) || 20, 1), 50);
  const offset = Math.min(Math.max(Number.parseInt(url.searchParams.get('cursor') ?? '0', 36) || 0, 0), 5000);

  const where = ['j.active = 1'];
  const binds: unknown[] = [];
  const add = (sql: string, ...values: unknown[]) => { where.push(sql); binds.push(...values); };
  const inList = (col: string, values: string[]) => values.length && add(`${col} IN (${values.map(() => '?').join(', ')})`, ...values);

  const category = text(f.category, 40);
  if (category) add('j.category = ?', category);
  inList('j.work_mode', f.workMode.filter((m) => WORK_MODES.includes(m)));
  inList('j.employment_type', f.type.filter((t) => TYPES.includes(t)));
  inList('j.experience', f.level.filter((l) => LEVELS.includes(l)));
  const place = foldText(text(f.where, 60));
  if (place.includes('remote')) add("j.work_mode = 'remote'");
  else if (place) add("j.location_norm LIKE ? ESCAPE '\\'", `%${place.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (f.posted && POSTED.has(f.posted)) add('j.posted_at >= ?', new Date(Date.now() - Number(f.posted) * DAY).toISOString());
  if (f.easyApply) add('0 = 1'); // real jobs are applied for on the employer's site
  // Saved jobs: fetch by id (closed jobs simply don't come back).
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter((id) => JOB_ID.test(id)).slice(0, 50);
  if (url.searchParams.has('ids')) {
    if (!ids.length) return { jobs: [], nextCursor: null, total: 0 };
    inList('j.id', ids);
  }

  const q = text(f.q, 80);
  const match = q ? ftsQuery(q) : '';
  if (q && !match) return { jobs: [], nextCursor: null, total: 0 };
  const from = match ? 'jobs j JOIN jobs_fts ON jobs_fts.rowid = j.rowid' : 'jobs j';
  if (match) { where.unshift('jobs_fts MATCH ?'); binds.unshift(match); }

  const order = f.sort === 'recent' ? 'j.posted_at DESC'
    : f.sort === 'salary' ? 'j.salary_annual_max IS NULL, j.salary_annual_max DESC, j.posted_at DESC'
    : match ? 'bm25(jobs_fts, 10.0, 4.0, 2.0, 1.0), j.posted_at DESC' : 'j.posted_at DESC';

  const sqlWhere = where.join(' AND ');
  const [count, page] = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ${from} WHERE ${sqlWhere}`).bind(...binds),
    env.DB.prepare(`SELECT ${LIST_COLUMNS} FROM ${from} WHERE ${sqlWhere} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...binds, limit, offset),
  ]);
  const total = (count.results[0] as { n: number }).n;
  const rows = page.results as unknown as JobRow[];
  return { jobs: rows.map(rowToJob), total, nextCursor: offset + rows.length < total ? (offset + limit).toString(36) : null };
}

async function getJob(id: string, env: Env) {
  if (!JOB_ID.test(id)) throw new HttpError(404, 'Job not found');
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND active = 1').bind(id).first<JobRow>();
  if (!row) throw new HttpError(404, 'Job not found');
  const full = await withDescription(env, row);
  if (!full) throw new HttpError(404, 'This job has closed');
  return rowToJob(full);
}

async function listCompanies(env: Env) {
  const { results } = await env.DB.prepare(`SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.active = 1) AS open_jobs
    FROM companies c WHERE c.curated = 1 ORDER BY open_jobs DESC, c.name`).all<CompanyRow>();
  return results.map(rowToCompany);
}

async function getCompany(id: string, env: Env) {
  if (!/^[\w-]{1,80}$/.test(id)) throw new HttpError(404, 'Company not found');
  const [company, jobs] = await env.DB.batch([
    env.DB.prepare(`SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.active = 1) AS open_jobs FROM companies c WHERE c.id = ?`).bind(id),
    env.DB.prepare(`SELECT ${LIST_COLUMNS} FROM jobs j WHERE j.company_id = ? AND j.active = 1 ORDER BY j.posted_at DESC LIMIT 50`).bind(id),
  ]);
  const row = company.results[0] as CompanyRow | undefined;
  if (!row) throw new HttpError(404, 'Company not found');
  return { company: rowToCompany(row), jobs: (jobs.results as unknown as JobRow[]).map(rowToJob) };
}

async function meta(env: Env) {
  const [cats, totals, last] = await env.DB.batch([
    env.DB.prepare('SELECT category AS name, COUNT(*) AS count FROM jobs WHERE active = 1 GROUP BY category ORDER BY count DESC, name'),
    env.DB.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(work_mode = 'remote'), 0) AS remote, COUNT(DISTINCT company_id) AS companies
      FROM jobs WHERE active = 1`),
    env.DB.prepare("SELECT value FROM ingest_state WHERE key = 'last_run'"),
  ]);
  const t = totals.results[0] as { total: number; remote: number; companies: number };
  const lastRun = last.results[0] as { value: string } | undefined;
  return {
    categories: cats.results,
    ...t,
    easyApply: 0, // real jobs are applied for on the employer's site
    lastIngestAt: lastRun ? (JSON.parse(lastRun.value) as { at: string }).at : null,
  };
}

export async function handleApi(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  try {
    if (path === '/api/admin/ingest') {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
      if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== `Bearer ${env.ADMIN_TOKEN}`) throw new HttpError(404, 'Not found');
      return json({ results: await runIngest(env) });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Read-only API');

    if (path === '/api/health') return json({ ok: true });
    if (path === '/api/meta') return await cached(req, env, ctx, async () => json(await meta(env)));
    if (path === '/api/jobs') return await cached(req, env, ctx, async () => json(await listJobs(url, env)));
    if (path === '/api/companies') return await cached(req, env, ctx, async () => json(await listCompanies(env)));
    const job = path.match(/^\/api\/jobs\/([^/]+)$/);
    if (job) return await cached(req, env, ctx, async () => json(await getJob(decodeURIComponent(job[1]), env)));
    const company = path.match(/^\/api\/companies\/([^/]+)$/);
    if (company) return await cached(req, env, ctx, async () => json(await getCompany(decodeURIComponent(company[1]), env)));
    throw new HttpError(404, 'Not found');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('api error', path, e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
