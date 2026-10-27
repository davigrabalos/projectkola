// Adapter tests: real (trimmed) Greenhouse and Lever payloads, and an Adzuna payload in its documented shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapGreenhouse } from '../ingest/greenhouse.ts';
import { mapLever } from '../ingest/lever.ts';
import { mapAdzuna } from '../ingest/adzuna.ts';
import { BOARDS, ADZUNA_MARKETS } from '../sources.ts';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const board = (token) => BOARDS.find((b) => b.token === token);

test('greenhouse: keeps Europe/Brazil roles and maps every field', () => {
  const jobs = mapGreenhouse(board('feedzai'), fixture('greenhouse-list.json'));
  assert.equal(jobs.length, 4);
  const [pm, eng, ar] = jobs;
  assert.equal(pm.id, 'gh-7978882');
  assert.equal(pm.companyId, 'feedzai');
  assert.equal(pm.boardToken, 'feedzai');
  assert.equal(pm.country, 'PT');
  assert.equal(pm.category, 'Product');
  assert.equal(pm.experience, 'senior');
  assert.equal(pm.postedAt, new Date('2026-06-03T07:50:14-04:00').toISOString(), 'first_published wins over updated_at');
  assert.match(pm.applyUrl, /^https:\/\/careers\.feedzai\.com\//);
  assert.equal(eng.country, 'BR');
  assert.equal(eng.location, 'São Paulo, Brazil', 'location is trimmed');
  assert.equal(eng.category, 'Engineering');
  assert.equal(ar.category, 'Marketing', 'department metadata beats the word "Analyst" in the title');
  assert.equal(jobs[3].country, 'GB');
});

test('greenhouse: drops roles outside the markets, keeps EMEA remote', () => {
  const src = board('feedzai');
  const jobs = mapGreenhouse(src, { jobs: [
    { id: 1, title: 'Engineer', absolute_url: 'https://x/1', updated_at: '2026-10-01T00:00:00Z', location: { name: 'San Francisco, CA' } },
    { id: 2, title: 'Engineer', absolute_url: 'https://x/2', updated_at: '2026-10-01T00:00:00Z', location: { name: 'Remote' }, metadata: [{ name: 'Region', value: 'EMEA' }] },
    { id: 3, title: 'Engineer', absolute_url: 'https://x/3', updated_at: '2026-10-01T00:00:00Z', location: { name: 'Remote' } },
    { id: 4, title: 'Engineer', absolute_url: 'https://x/4', updated_at: '2026-10-01T00:00:00Z', location: null },
  ] });
  assert.deepEqual(jobs.map((j) => [j.id, j.country, j.workMode]), [['gh-2', 'EU', 'remote']]);
});

test('lever: uses country, workplaceType, commitment and department', () => {
  const jobs = mapLever(board('agicap'), fixture('lever-list.json'));
  assert.equal(jobs.length, 3);
  const [ae] = jobs;
  assert.equal(ae.id, 'lv-e0aa73bf-2622-4391-a30c-0629fbfa99ec');
  assert.equal(ae.country, 'DE');
  assert.equal(ae.workMode, 'hybrid');
  assert.equal(ae.employmentType, 'full-time');
  assert.equal(ae.category, 'Sales');
  assert.match(ae.applyUrl, /\/apply$/);
  assert.match(ae.sourceUrl, /^https:\/\/jobs\.lever\.co\/agicap\//);
  assert.ok(ae.summary.length > 20 && ae.summary.length <= 221, 'summary is filled and bounded');
  assert.ok(ae.skills.includes('German'), `skills from the description lists: ${ae.skills}`);
});

test('adzuna: strips highlight tags, drops predicted pay, skips anonymous ads', () => {
  const gb = ADZUNA_MARKETS.find((m) => m.code === 'gb');
  const jobs = mapAdzuna(gb, fixture('adzuna-search.json'));
  assert.equal(jobs.length, 2, 'the ad without an employer is skipped');
  const [dev, support] = jobs;
  assert.equal(dev.title, 'Senior React Developer');
  assert.equal(dev.companyId, 'az-northwind-labs');
  assert.equal(dev.country, 'GB');
  assert.equal(dev.workMode, 'hybrid');
  assert.deepEqual(dev.salary, { min: 60000, max: 75000, currency: 'GBP', period: 'year' });
  assert.ok(dev.summary.includes('…') && !dev.summary.includes('&hellip;'));
  assert.ok(dev.skills.includes('React') && dev.skills.includes('TypeScript'));
  assert.equal(dev.applyUrl, 'https://www.adzuna.co.uk/jobs/land/ad/5001?se=x', 'applying goes through Adzuna');
  assert.equal(support.salary, null, 'predicted salaries are not shown');
  assert.equal(support.employmentType, 'part-time');
  assert.equal(support.category, 'Customer success');
});
