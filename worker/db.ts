import type { Company, EmploymentType, ExperienceLevel, Job, JobProvider, SalaryPeriod, WorkMode } from '../src/data/types.ts';
import { annualMax, fingerprint, foldText, type NormalizedJob } from './normalize.ts';
import type { CompanyInfo } from './sources.ts';

/* D1 access. D1 allows at most 100 bound parameters per statement, hence the chunking. */

export interface JobRow {
  id: string;
  provider: JobProvider;
  external_id: string;
  board_token: string;
  company_id: string;
  company_name: string;
  title: string;
  category: string;
  location: string;
  country: string;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience: ExperienceLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: SalaryPeriod | null;
  posted_at: string;
  apply_url: string;
  source_url: string;
  summary: string;
  skills: string;
  description_html: string | null;
  active: number;
}

/** Every column the API reads; the list endpoint leaves out description_html. */
export const LIST_COLUMNS = `j.id, j.provider, j.external_id, j.board_token, j.company_id, j.company_name, j.title, j.category, j.location,
  j.country, j.work_mode, j.employment_type, j.experience, j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
  j.posted_at, j.apply_url, j.source_url, j.summary, j.skills, NULL AS description_html, j.active`;

const PARAMS_PER_QUERY = 90;
const STATEMENTS_PER_BATCH = 50;

const chunk = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
const marks = (n: number) => Array(n).fill('?').join(', ');

async function batch(db: D1Database, statements: D1PreparedStatement[]) {
  for (const part of chunk(statements, STATEMENTS_PER_BATCH)) await db.batch(part);
}

const UPSERT = `INSERT INTO jobs (id, provider, external_id, board_token, company_id, company_name, title, category, location, location_norm, country,
  work_mode, employment_type, experience, salary_min, salary_max, salary_currency, salary_period, salary_annual_max, posted_at,
  apply_url, source_url, summary, skills, description_html, hash, active, first_seen_at, updated_at)
VALUES (${marks(24)}, NULL, ?, 1, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  board_token = excluded.board_token, company_id = excluded.company_id, company_name = excluded.company_name,
  title = excluded.title, category = excluded.category, location = excluded.location, location_norm = excluded.location_norm,
  country = excluded.country,
  work_mode = excluded.work_mode, employment_type = excluded.employment_type, experience = excluded.experience,
  salary_min = excluded.salary_min, salary_max = excluded.salary_max, salary_currency = excluded.salary_currency,
  salary_period = excluded.salary_period, salary_annual_max = excluded.salary_annual_max, posted_at = excluded.posted_at,
  apply_url = excluded.apply_url, source_url = excluded.source_url, summary = excluded.summary, skills = excluded.skills,
  description_html = NULL, hash = excluded.hash, active = 1, updated_at = excluded.updated_at`;

/**
 * Writes jobs that are new or changed (by fingerprint) and re-activates unchanged ones that had been closed.
 * A changed job loses its cached description, which is fetched again on the next view.
 */
export async function upsertJobs(db: D1Database, jobs: NormalizedJob[], now: string) {
  const existing = new Map<string, { hash: string; active: number }>();
  for (const ids of chunk(jobs.map((j) => j.id), PARAMS_PER_QUERY)) {
    const { results } = await db.prepare(`SELECT id, hash, active FROM jobs WHERE id IN (${marks(ids.length)})`).bind(...ids)
      .all<{ id: string; hash: string; active: number }>();
    for (const r of results) existing.set(r.id, r);
  }
  const statements: D1PreparedStatement[] = [];
  let unchanged = 0;
  for (const j of jobs) {
    const hash = fingerprint(j);
    const prev = existing.get(j.id);
    if (prev?.hash === hash) {
      if (prev.active) unchanged++;
      else statements.push(db.prepare('UPDATE jobs SET active = 1, updated_at = ? WHERE id = ?').bind(now, j.id));
      continue;
    }
    statements.push(db.prepare(UPSERT).bind(
      j.id, j.provider, j.externalId, j.boardToken, j.companyId, j.companyName, j.title, j.category, j.location, foldText(j.location), j.country,
      j.workMode, j.employmentType, j.experience, j.salary?.min ?? null, j.salary?.max ?? null, j.salary?.currency ?? null,
      j.salary?.period ?? null, annualMax(j.salary), j.postedAt, j.applyUrl, j.sourceUrl, j.summary, JSON.stringify(j.skills),
      hash, now, now,
    ));
  }
  await batch(db, statements);
  return { written: statements.length, unchanged };
}

/** Closes a company's jobs (from one provider) that were not in its latest full listing. */
export async function deactivateMissing(db: D1Database, provider: JobProvider, companyId: string, seen: Set<string>, now: string) {
  const { results } = await db.prepare('SELECT id FROM jobs WHERE provider = ? AND company_id = ? AND active = 1')
    .bind(provider, companyId).all<{ id: string }>();
  const gone = results.map((r) => r.id).filter((id) => !seen.has(id));
  await batch(db, chunk(gone, PARAMS_PER_QUERY).map((ids) =>
    db.prepare(`UPDATE jobs SET active = 0, updated_at = ? WHERE id IN (${marks(ids.length)})`).bind(now, ...ids)));
  return gone.length;
}

/** Curated company: written only when something differs (no write on most runs). */
export function upsertCompany(db: D1Database, c: CompanyInfo, now: string) {
  return db.prepare(`INSERT INTO companies (id, name, industry, headquarters, website, about, curated, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT (id) DO UPDATE SET name = excluded.name, industry = excluded.industry, headquarters = excluded.headquarters,
      website = excluded.website, about = excluded.about, curated = 1, updated_at = excluded.updated_at
    WHERE companies.name IS NOT excluded.name OR companies.industry IS NOT excluded.industry
      OR companies.headquarters IS NOT excluded.headquarters OR companies.website IS NOT excluded.website
      OR companies.about IS NOT excluded.about OR companies.curated IS NOT 1`)
    .bind(c.id, c.name, c.industry, c.headquarters, c.website, c.about, now).run();
}

/** Companies seen only in a feed (Adzuna): a name, nothing else. Inserted once. */
export async function insertFeedCompanies(db: D1Database, companies: { id: string; name: string }[], now: string) {
  const unique = [...new Map(companies.map((c) => [c.id, c])).values()];
  await batch(db, unique.map((c) =>
    db.prepare('INSERT OR IGNORE INTO companies (id, name, curated, updated_at) VALUES (?, ?, 0, ?)').bind(c.id, c.name, now)));
}

export async function getState<T>(db: D1Database, key: string): Promise<T | undefined> {
  const row = await db.prepare('SELECT value FROM ingest_state WHERE key = ?').bind(key).first<{ value: string }>();
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export function setState(db: D1Database, key: string, value: unknown, now: string) {
  return db.prepare(`INSERT INTO ingest_state (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(key, JSON.stringify(value), now).run();
}

const DAY = 86_400_000;

/** Feed jobs expire by age; closed jobs are deleted after 30 days. */
export async function cleanup(db: D1Database, now: Date) {
  const cutoff = new Date(now.getTime() - 30 * DAY).toISOString();
  await db.batch([
    db.prepare("UPDATE jobs SET active = 0, updated_at = ? WHERE provider = 'adzuna' AND active = 1 AND posted_at < ?").bind(now.toISOString(), cutoff),
    db.prepare('DELETE FROM jobs WHERE active = 0 AND updated_at < ?').bind(cutoff),
  ]);
}

/* ---------- Rows -> the app's types ---------- */

export function rowToJob(r: JobRow): Job {
  return {
    id: r.id,
    title: r.title,
    companyId: r.company_id,
    company: { id: r.company_id, name: r.company_name },
    category: r.category,
    location: r.location,
    workMode: r.work_mode,
    employmentType: r.employment_type,
    experience: r.experience,
    salary: r.salary_min !== null && r.salary_max !== null && r.salary_currency && r.salary_period
      ? { min: r.salary_min, max: r.salary_max, currency: r.salary_currency, period: r.salary_period }
      : undefined,
    postedAt: r.posted_at,
    easyApply: false,
    summary: r.summary,
    responsibilities: [],
    requirements: [],
    benefits: [],
    skills: JSON.parse(r.skills) as string[],
    applyUrl: r.apply_url,
    source: { provider: r.provider, url: r.source_url },
    ...(r.description_html ? { descriptionHtml: r.description_html } : {}),
  };
}

export interface CompanyRow {
  id: string;
  name: string;
  industry: string;
  headquarters: string;
  website: string;
  about: string;
  curated: number;
  open_jobs?: number;
}

export function rowToCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    name: r.name,
    industry: r.industry,
    size: '',
    headquarters: r.headquarters,
    website: r.website,
    about: r.about,
    curated: r.curated === 1,
    ...(r.open_jobs !== undefined ? { openJobs: r.open_jobs } : {}),
  };
}
