export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Adzuna credentials (wrangler secret put). Adzuna is skipped while either is missing. */
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
  /** Sources handled per cron run (default 3; see the CPU note in ingest/run.ts). */
  INGEST_PER_RUN?: string;
  /** Seconds API responses are cached at the edge. "0" in local dev. */
  CACHE_TTL?: string;
  /** Enables POST /api/admin/ingest (Authorization: Bearer <token>). Unset = endpoint disabled. */
  ADMIN_TOKEN?: string;
}
