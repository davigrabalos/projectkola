-- Kola jobs database (Cloudflare D1 / SQLite).
-- Writes are budgeted (Free plan: 100k rows written per day), so ingest only writes jobs that changed,
-- and the search index is only touched when a searchable column changes.

CREATE TABLE companies (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  industry      TEXT NOT NULL DEFAULT '',
  headquarters  TEXT NOT NULL DEFAULT '',
  website       TEXT NOT NULL DEFAULT '',
  about         TEXT NOT NULL DEFAULT '',
  -- 1 = curated hiring partner (Companies pages); 0 = seen only in a job feed (Adzuna).
  curated       INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL
);

CREATE TABLE jobs (
  id                TEXT PRIMARY KEY,          -- gh-123, lv-<uuid>, az-123
  provider          TEXT NOT NULL,             -- greenhouse | lever | adzuna
  external_id       TEXT NOT NULL,
  board_token       TEXT NOT NULL DEFAULT '',  -- to fetch the full description later
  company_id        TEXT NOT NULL,
  company_name      TEXT NOT NULL,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  location          TEXT NOT NULL,
  location_norm     TEXT NOT NULL,             -- lowercase, no accents: "sao paulo" finds "São Paulo"
  country           TEXT NOT NULL,
  work_mode         TEXT NOT NULL,
  employment_type   TEXT NOT NULL,
  experience        TEXT NOT NULL,
  salary_min        INTEGER,
  salary_max        INTEGER,
  salary_currency   TEXT,
  salary_period     TEXT,
  salary_annual_max INTEGER,                   -- for "sort by pay"
  posted_at         TEXT NOT NULL,
  apply_url         TEXT NOT NULL,
  source_url        TEXT NOT NULL,
  summary           TEXT NOT NULL DEFAULT '',
  skills            TEXT NOT NULL DEFAULT '[]', -- JSON array
  description_html  TEXT,                       -- filled on first view (detail endpoint)
  hash              TEXT NOT NULL,              -- fingerprint of the stored fields
  active            INTEGER NOT NULL DEFAULT 1,
  first_seen_at     TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX jobs_active_posted ON jobs (active, posted_at DESC);
CREATE INDEX jobs_company ON jobs (company_id, active);
CREATE INDEX jobs_provider_company ON jobs (provider, company_id);
CREATE INDEX jobs_category ON jobs (active, category);

-- Full-text search over the searchable columns (external content: no duplicate storage).
-- Porter stemming: "engineer" finds "engineering"; "react" does not find "reactivations".
CREATE VIRTUAL TABLE jobs_fts USING fts5(
  title, company_name, skills, category,
  content = 'jobs', content_rowid = 'rowid',
  tokenize = 'porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER jobs_fts_insert AFTER INSERT ON jobs BEGIN
  INSERT INTO jobs_fts (rowid, title, company_name, skills, category)
  VALUES (new.rowid, new.title, new.company_name, new.skills, new.category);
END;

CREATE TRIGGER jobs_fts_delete AFTER DELETE ON jobs BEGIN
  INSERT INTO jobs_fts (jobs_fts, rowid, title, company_name, skills, category)
  VALUES ('delete', old.rowid, old.title, old.company_name, old.skills, old.category);
END;

CREATE TRIGGER jobs_fts_update AFTER UPDATE OF title, company_name, skills, category ON jobs
WHEN old.title IS NOT new.title OR old.company_name IS NOT new.company_name
  OR old.skills IS NOT new.skills OR old.category IS NOT new.category
BEGIN
  INSERT INTO jobs_fts (jobs_fts, rowid, title, company_name, skills, category)
  VALUES ('delete', old.rowid, old.title, old.company_name, old.skills, old.category);
  INSERT INTO jobs_fts (rowid, title, company_name, skills, category)
  VALUES (new.rowid, new.title, new.company_name, new.skills, new.category);
END;

-- Per-source progress (rotation cursor, Lever paging, ids seen in the current pass).
CREATE TABLE ingest_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
