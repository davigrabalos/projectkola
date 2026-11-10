// Rebuilds the app's mock data (src/data/jobs.ts, src/data/companies.ts) from real, currently open postings
// on the curated companies' public Greenhouse / Lever boards (worker/sources.ts), so every mock job links
// to a live job page. Run: npm run mock:refresh  (re-run whenever links start to expire).
// Reuses the Worker's adapters, so it needs Node's TypeScript stripping (Node 22.6+).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARDS } from '../../worker/sources.ts';
import { fetchGreenhouseList, fetchGreenhouseJob, mapGreenhouse } from '../../worker/ingest/greenhouse.ts';
import { fetchLeverPage, fetchLeverPosting, mapLever } from '../../worker/ingest/lever.ts';
import { htmlToText, summarize, unescapeHtml } from '../../worker/normalize.ts';
import { extractSkills } from '../../src/lib/skills.ts';

const UA = 'KolaJobs/0.1 (mock data refresh; links back to every original posting)';

const PER_COMPANY = 3;
/** Candidates whose details are fetched per company; the richest PER_COMPANY are kept. */
const CANDIDATES = 8;
const MAX_ITEMS = 5;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Some boards still list roles whose job page says "gone" (404/410): skip those. A 403 is a site
    refusing automated requests, not a closed job, so it passes. */
async function linkOk(url) {
  const res = await retry(() => fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': UA } }));
  res.body?.cancel();
  return res.status !== 404 && res.status !== 410;
}

/** Retries network blips (not 404s: a missing board or closed job stays missing). */
async function retry(fn, tries = 3) {
  for (let n = 1; ; n++) {
    try { return await fn(); } catch (e) {
      if (n >= tries || e.status === 404) throw e;
      await sleep(1000 * 2 ** n);
    }
  }
}

/* Section headings in postings -> the three lists on Kola's job page.
   Checked in this order, so "What you'll bring to the role" counts as requirements, not responsibilities. */
const SECTIONS = [
  ['benefits', /(benefit|perk|we offer|offer you|in it for you|why (join|you('|’)ll love)|compensation|what we give|oferecemos|benef[ií]cios)/i],
  ['requirements', /(require|qualif|bring|you('|’)ll need|you need|you (have|are)|looking for|about you|who you are|ideal|skills|experience|must[- ]have|nice to have|profile|requisitos|procuramos)/i],
  ['responsibilities', /(doing|you('|’)ll do|you will|responsib|role|mission|impact|day[- ]to[- ]day|what you do|deliver|work on|atividades|responsabilidades|desafios)/i],
];
/* Kola is in English; Brazilian postings may be in Portuguese. */
const ENGLISH = /\b(the|and|you|with|our|for|will|to)\b/gi;
const PORTUGUESE = /\b(voc[eê]|para|com|nossa|nosso|vaga|experi[eê]ncia|e)\b/gi;
const languageOk = (j, text) => (text.match(ENGLISH)?.length ?? 0) >= 6 || (j.country === 'BR' && (text.match(PORTUGUESE)?.length ?? 0) >= 6);
const sectionOf = (heading) => SECTIONS.find(([, re]) => re.test(heading))?.[0];
const clean = (html) => htmlToText(html).replace(/\s+/g, ' ').trim();
const clip = (s) => (s.length > 180 ? `${s.slice(0, 177).trimEnd()}…` : s);
const items = (ulHtml) => [...ulHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clip(clean(m[1]))).filter((s) => s.length > 2);

/** Headed bullet lists in a description: <h3>/<p><strong> heading, then the next <ul>. */
function sectionsFromHtml(html) {
  const out = { responsibilities: [], requirements: [], benefits: [] };
  const re = /<(h[1-6]|strong|b)[^>]*>([\s\S]*?)<\/\1>[\s\S]*?(<ul[^>]*>[\s\S]*?<\/ul>)/gi;
  for (const m of html.matchAll(re)) {
    const key = sectionOf(clean(m[2]));
    if (key && !out[key].length) out[key] = items(m[3]).slice(0, MAX_ITEMS);
  }
  return out;
}

/** Up to n jobs, newest first, spreading across categories. */
function pick(jobs, n) {
  const byCat = new Map();
  for (const j of [...jobs].sort((a, b) => b.postedAt.localeCompare(a.postedAt))) {
    if (!byCat.has(j.category)) byCat.set(j.category, []);
    byCat.get(j.category).push(j);
  }
  const out = [];
  while (out.length < n && [...byCat.values()].some((l) => l.length)) for (const l of byCat.values()) if (l.length && out.length < n) out.push(l.shift());
  return out;
}

async function detail(src, j) {
  if (src.kind === 'greenhouse') {
    const d = await fetchGreenhouseJob(src.token, j.externalId);
    const html = unescapeHtml(d.content ?? '');
    const pay = d.pay_input_ranges?.find((r) => r.min_cents > 0 && r.max_cents >= r.min_cents);
    const text = clean(html);
    return {
      text,
      ...sectionsFromHtml(html),
      // First real paragraph, so a leading heading ("The Team") doesn't open the summary twice.
      summary: j.summary || summarize([...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).find((t) => t.length > 80) ?? text),
      skills: j.skills.length > 1 ? j.skills : extractSkills(`${j.title} ${text}`),
      salary: pay ? { min: Math.round(pay.min_cents / 100), max: Math.round(pay.max_cents / 100), currency: pay.currency_type, period: 'year' } : j.salary,
    };
  }
  const p = await fetchLeverPosting(src.token, j.externalId);
  const out = { text: `${j.title} ${htmlToText(p.description ?? '')} ${(p.lists ?? []).map((l) => `${l.text} ${htmlToText(l.content ?? '')}`).join(' ')}`, responsibilities: [], requirements: [], benefits: [], summary: j.summary, skills: j.skills, salary: j.salary };
  for (const l of p.lists ?? []) {
    const key = sectionOf(l.text ?? '');
    if (key && !out[key].length) out[key] = items(`<ul>${l.content ?? ''}</ul>`).slice(0, MAX_ITEMS);
  }
  return out;
}

const jobs = [];
const companies = [];
for (const src of BOARDS) {
  try {
    const mapped = (src.kind === 'greenhouse'
      ? mapGreenhouse(src, await retry(() => fetchGreenhouseList(src.token)))
      : mapLever(src, await retry(() => fetchLeverPage(src.token, 0))))
      .filter((j) => !/^copy of /i.test(j.title)); // unpublished duplicates some boards leak
    const candidates = [];
    for (const j of pick(mapped, CANDIDATES)) {
      const d = await retry(() => detail(src, j)).catch(() => null);
      if (d && languageOk(j, d.text) && await linkOk(j.applyUrl).catch(() => false)) candidates.push({ j, d, rich: ['responsibilities', 'requirements', 'benefits'].filter((k) => d[k].length).length });
      await sleep(120);
    }
    // Richest first, but keep the category spread from pick() among equally rich ones.
    const chosen = candidates.map((c, i) => ({ ...c, i })).sort((a, b) => b.rich - a.rich || a.i - b.i).slice(0, PER_COMPANY);
    for (const { j, d } of chosen) {
      jobs.push({
        id: j.id, title: j.title, companyId: j.companyId, category: j.category, location: j.location,
        workMode: j.workMode, employmentType: j.employmentType, experience: j.experience,
        ...(d.salary ? { salary: d.salary } : {}),
        postedAt: j.postedAt, easyApply: false, applyUrl: j.applyUrl, source: { provider: j.provider, url: j.sourceUrl },
        summary: d.summary, responsibilities: d.responsibilities, requirements: d.requirements, benefits: d.benefits, skills: d.skills,
      });
    }
    if (chosen.length) companies.push({ ...src.company, size: '' });
    console.log(`${src.company.name.padEnd(16)} ${String(mapped.length).padStart(3)} open in EU/BR, ${candidates.length} usable, kept ${chosen.length}`);
  } catch (e) {
    console.log(`${src.company.name.padEnd(16)} skipped (${e.message})`);
  }
  await sleep(300);
}

const today = new Date().toISOString().slice(0, 10);
const header = (what) => `// GENERATED by scripts/mock/refresh-jobs.mjs on ${today} - do not edit by hand (npm run mock:refresh).\n// ${what}\n`;
fs.writeFileSync(path.join(root, 'src/data/jobs.ts'),
  `${header('Mock jobs: real postings from the companies\' public job boards, so every Apply link opens a live job page. Links expire as roles close; refresh to update.')}import type { Job } from './types';\n\nexport const jobs: Job[] = ${JSON.stringify(jobs, null, 1)};\n`);
fs.writeFileSync(path.join(root, 'src/data/companies.ts'),
  `${header('Mock companies: the curated hiring partners from worker/sources.ts that have open roles.')}import type { Company } from './types';\n\nexport const companies: Company[] = ${JSON.stringify(companies, null, 1)};\n`);
console.log(`\n${jobs.length} jobs from ${companies.length} companies written to src/data/.`);
