import { extractSkills } from '../../src/lib/skills.ts';
import type { JobRow } from '../db.ts';
import type { Env } from '../env.ts';
import { htmlToText, summarize, unescapeHtml } from '../normalize.ts';
import { sanitizeHtml } from '../sanitize.ts';
import { fetchGreenhouseJob } from './greenhouse.ts';
import { SourceError } from './http.ts';
import { fetchLeverPosting } from './lever.ts';

/* Full descriptions are fetched the first time a job is opened, then stored. This keeps the cron
   ingest light (lists only) and only spends requests on jobs people actually look at. */

const escapeText = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

type Detail = { html: string; salary?: { min: number; max: number; currency: string } };

async function fromSource(row: JobRow): Promise<Detail | null> {
  if (row.provider === 'greenhouse') {
    const d = await fetchGreenhouseJob(row.board_token, row.external_id);
    const pay = d.pay_input_ranges?.find((r) => r.min_cents > 0 && r.max_cents >= r.min_cents);
    return {
      html: unescapeHtml(d.content ?? ''),
      salary: pay ? { min: Math.round(pay.min_cents / 100), max: Math.round(pay.max_cents / 100), currency: pay.currency_type } : undefined,
    };
  }
  if (row.provider === 'lever') {
    const p = await fetchLeverPosting(row.board_token, row.external_id);
    // A list's content is usually <li> items, but some companies send paragraphs ("• ...") instead.
    const lists = (p.lists ?? []).map((l) => {
      const content = l.content ?? '';
      return `<h4>${escapeText((l.text ?? '').trim())}</h4>${/<li[\s>]/i.test(content) ? `<ul>${content}</ul>` : content}`;
    }).join('');
    return { html: `${p.description ?? ''}${lists}${p.additional ?? ''}` };
  }
  return null; // Adzuna: only a snippet exists; the full ad lives behind redirect_url.
}

/**
 * Returns the row with its description filled in (fetching and storing it on first view).
 * If the source says the job is gone, the job is closed and null is returned.
 * If the source is unreachable, the row is returned as is (summary only).
 */
export async function withDescription(env: Env, row: JobRow): Promise<JobRow | null> {
  if (row.description_html !== null || row.provider === 'adzuna') return row;
  let detail: Detail | null;
  try {
    detail = await fromSource(row);
  } catch (e) {
    if (e instanceof SourceError && e.status === 404) {
      await env.DB.prepare('UPDATE jobs SET active = 0, updated_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
      return null;
    }
    console.warn(`description for ${row.id} unavailable:`, String(e));
    return row;
  }
  if (!detail) return row;

  const html = await sanitizeHtml(detail.html);
  const text = htmlToText(html);
  const summary = row.summary || summarize(text);
  const skills = JSON.stringify(extractSkills(`${row.title} ${text}`));
  const salary = row.salary_min === null && detail.salary ? detail.salary : null;

  await env.DB.prepare(`UPDATE jobs SET description_html = ?, summary = ?, skills = ?,
      salary_min = COALESCE(?, salary_min), salary_max = COALESCE(?, salary_max), salary_currency = COALESCE(?, salary_currency),
      salary_period = COALESCE(?, salary_period), salary_annual_max = COALESCE(?, salary_annual_max)
    WHERE id = ?`)
    .bind(html, summary, skills, salary?.min ?? null, salary?.max ?? null, salary?.currency ?? null, salary ? 'year' : null, salary?.max ?? null, row.id)
    .run();

  return {
    ...row,
    description_html: html,
    summary,
    skills,
    ...(salary ? { salary_min: salary.min, salary_max: salary.max, salary_currency: salary.currency, salary_period: 'year' as const } : {}),
  };
}
