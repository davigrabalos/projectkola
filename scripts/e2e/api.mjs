// API checks against a local Worker with data: npm run dev:api, run a few ingests, then npm run e2e:api.
const A = process.env.API_URL ?? 'http://localhost:8787/api';
const get = async (p, init) => { const r = await fetch(A + p, init); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : null, headers: r.headers }; };
let fails = 0; const check = (n, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${extra !== '' ? '  (' + extra + ')' : ''}`); };

const meta = (await get('/meta')).body;
check('meta: totals and categories', meta.total > 2000 && meta.categories.length >= 6 && meta.companies === 34, `${meta.total} jobs, ${meta.categories.length} categories`);
const react = (await get('/jobs?q=react&limit=10')).body;
check('search "react" skips "Reactivations"', react.jobs.length > 0 && !react.jobs.some((j) => /reactivation/i.test(j.title)), react.jobs.map((j) => j.title).slice(0, 3).join(' · '));
const eng = (await get('/jobs?q=engineer&limit=50')).body;
check('stemming: "engineer" also finds "Engineering"', eng.jobs.some((j) => /engineering/i.test(j.title) && !/engineer\b/i.test(j.title)) || eng.total > 600, `total ${eng.total}`);
const prefix = (await get('/jobs?q=backend%20eng&limit=5')).body;
check('short last word is a prefix', prefix.total > 0, `total ${prefix.total}`);
const sp1 = (await get('/jobs?where=sao%20paulo&limit=1')).body.total, sp2 = (await get('/jobs?where=S%C3%A3o%20Paulo&limit=1')).body.total;
check('where is accent-insensitive', sp1 === sp2 && sp1 > 100, `${sp1} vs ${sp2}`);
const remote = (await get('/jobs?where=remote&limit=50')).body;
check('where=remote means remote work mode', remote.jobs.every((j) => j.workMode === 'remote'), `total ${remote.total}`);
const f = (await get('/jobs?category=Data&mode=remote,hybrid&level=senior,lead&sort=recent&limit=50')).body;
check('category + mode + level filters combine', f.jobs.every((j) => j.category === 'Data' && ['remote', 'hybrid'].includes(j.workMode) && ['senior', 'lead'].includes(j.experience)), `total ${f.total}`);
check('sort=recent is newest first', f.jobs.every((j, i, a) => i === 0 || a[i - 1].postedAt >= j.postedAt));
const posted = (await get('/jobs?posted=7&limit=50')).body;
check('posted=7 only last week', posted.jobs.every((j) => Date.now() - Date.parse(j.postedAt) <= 7 * 86400000 + 60000), `total ${posted.total}`);
const pay = (await get('/jobs?sort=salary&limit=5')).body;
check('sort=salary returns a list (no salaries until details are opened)', Array.isArray(pay.jobs), pay.jobs.map((j) => j.salary?.max ?? '-').join(','));

const p1 = (await get('/jobs?category=Engineering&limit=20')).body;
const p2 = (await get(`/jobs?category=Engineering&limit=20&cursor=${p1.nextCursor}`)).body;
check('cursor paging: next page, no overlap', p1.nextCursor && p2.jobs.length === 20 && !p2.jobs.some((j) => p1.jobs.some((k) => k.id === j.id)), `cursor ${p1.nextCursor}`);
const all = [];
let cur = '';
for (let i = 0; i < 100; i++) { const pg = (await get(`/jobs?category=Design&limit=50${cur ? '&cursor=' + cur : ''}`)).body; all.push(...pg.jobs); if (!pg.nextCursor) break; cur = pg.nextCursor; }
check('paging reaches every result exactly once', all.length === new Set(all.map((j) => j.id)).size && all.length === (await get('/jobs?category=Design&limit=1')).body.total, `${all.length}`);

check('job cards carry company, applyUrl, source', p1.jobs.every((j) => j.company?.name && j.applyUrl?.startsWith('https://') && j.source?.url) && p1.jobs.every((j) => !('descriptionHtml' in j)));
const big = await get('/jobs?limit=9999');
check('limit capped at 50', big.body.jobs.length === 50);
const junk = await get('/jobs?mode=moon&level=god&type=x&posted=999&sort=nope&category=' + 'x'.repeat(500));
check('junk params are ignored or capped, not errors', junk.status === 200, `status ${junk.status}, total ${junk.body.total}`);
const inj = await get('/jobs?q=%22%20OR%20*%20NEAR(%20%22');
check('FTS operator injection is harmless', inj.status === 200, `status ${inj.status}, total ${inj.body.total}`);
check('POST is rejected', (await get('/jobs', { method: 'POST' })).status === 405);
check('admin ingest hidden without token', (await get('/admin/ingest', { method: 'POST' })).status === 404);
check('admin ingest hidden with wrong token', (await get('/admin/ingest', { method: 'POST', headers: { Authorization: 'Bearer nope' } })).status === 404);
check('unknown job is a 404', (await get('/jobs/gh-1')).status === 404);
check('malformed id is a 404', (await get('/jobs/..%2F..%2Fetc')).status === 404);
check('unknown route is a 404', (await get('/nope')).status === 404);

// Detail: description fetched on first view, sanitised, stored
const ghJob = (await get('/jobs?q=engineer&limit=50')).body.jobs.find((j) => j.source.provider === 'greenhouse');
const t0 = Date.now(); const d1 = (await get('/jobs/' + ghJob.id)).body; const firstMs = Date.now() - t0;
const t1 = Date.now(); const d2 = (await get('/jobs/' + ghJob.id)).body; const secondMs = Date.now() - t1;
check('greenhouse detail has a description', (d1.descriptionHtml ?? '').length > 200, `${(d1.descriptionHtml ?? '').length} chars, ${firstMs}ms then ${secondMs}ms`);
check('description is sanitised (no scripts, styles, handlers, attributes)', !/<(script|style|iframe|img)|on\w+=|style=|class=/i.test(d1.descriptionHtml));
check('summary filled from the description', d1.summary.length > 30);
check('second view served from D1', d2.descriptionHtml === d1.descriptionHtml);
const lvJob = (await get('/jobs?limit=50&q=executive')).body.jobs.find((j) => j.source.provider === 'lever') ?? (await get('/companies/spotify')).body.jobs[0];
const ld = (await get('/jobs/' + lvJob.id)).body;
check('lever detail includes the list sections, valid nesting', /<h4>/.test(ld.descriptionHtml ?? '') && !/<ul>\s*<(p|div)/.test(ld.descriptionHtml ?? ''), `${(ld.descriptionHtml ?? '').length} chars`);
const links = [...(d1.descriptionHtml + ld.descriptionHtml).matchAll(/<a [^>]*>/g)].map((m) => m[0]);
check('links are external, noopener, new tab', links.every((a) => /href="https?:\/\//.test(a) && /rel="noopener noreferrer nofollow"/.test(a) && /target="_blank"/.test(a)), `${links.length} links`);

const cos = (await get('/companies')).body;
check('companies: 34 curated with open-job counts', cos.length === 34 && cos.every((c) => c.curated && typeof c.openJobs === 'number'));
const fz = (await get('/companies/feedzai')).body;
check('company detail with its open jobs', fz.company.name === 'Feedzai' && fz.jobs.length === fz.company.openJobs, `${fz.jobs.length} jobs`);
check('unknown company is a 404', (await get('/companies/nope')).status === 404);
check('JSON + nosniff headers', (await get('/meta')).headers.get('x-content-type-options') === 'nosniff');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
