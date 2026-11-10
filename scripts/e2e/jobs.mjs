// Jobs on the bundled mock data (real postings snapshotted by `npm run mock:refresh`):
// paging, filters, job page content, apply links to the live posting, companies, saved.
import { start, sleep } from './harness.mjs';
import { jobs } from '../../src/data/jobs.ts';
import { companies } from '../../src/data/companies.ts';
import { logos } from '../../src/data/logos.ts';
const { evaluate: js, go, shot, check, errors, finish } = await start('jobs', { debugPort: 9354 });
const wait = async (expr, ms = 5000) => { for (let t = 0; t < ms; t += 150) { if (await js(expr)) return true; await sleep(150); } return false; };

await go('/jobs', 300); await js(`localStorage.clear(); localStorage.setItem('kola:theme','light')`); await go('/jobs', 2200);
check('jobs page shows every mock job in the total', await js(`document.querySelector('#results-heading strong').textContent.replace(/\\D/g, '')`) === String(jobs.length));
check('first page has 20 cards', await js(`document.querySelectorAll('.results-list .job-card').length`) === 20);
await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Show more jobs').click()`);
check('show more appends the next page', await wait(`document.querySelectorAll('.results-list .job-card').length === 40`));
check('easy-apply filter hidden (every job applies on the employer site)', !(await js(`[...document.querySelectorAll('.filters label')].some(l => /Easy apply/.test(l.textContent))`)));

// The richest job: summary plus all three lists
const rich = jobs.find((j) => j.responsibilities.length && j.requirements.length && j.benefits.length);
await go(`/jobs/${rich.id}`, 1800);
check('job page: title and company', await js(`document.querySelector('h1').textContent === ${JSON.stringify(rich.title)} && document.body.textContent.includes(${JSON.stringify(companies.find((c) => c.id === rich.companyId).name)})`));
check('job page: what you\'ll do, requirements, benefits', await js(`['What you\\'ll do', 'What we\\'re looking for', 'Benefits'].every(h => [...document.querySelectorAll('.job-detail__section h2')].some(e => e.textContent === h))`));
check('apply opens the live posting in a new tab', await js(`(() => { const a = document.querySelector('.job-detail__actions a.btn--primary'); return a && a.target === '_blank' && a.rel.includes('noopener') && a.href === ${JSON.stringify(rich.applyUrl)} && /Apply on/.test(a.textContent); })()`));
check('source note links to the original posting', await js(`!!document.querySelector('.source-note a[href^="https://"]')`));
await shot('j-job.png');

check('every mock job has an https apply link and a source', jobs.every((j) => /^https:\/\//.test(j.applyUrl) && j.source?.url && !j.easyApply));

// Filters reach the mock API
await go('/jobs?category=Engineering', 1800);
const eng = jobs.filter((j) => j.category === 'Engineering').length;
check('category filter', await js(`document.querySelector('#results-heading strong').textContent.replace(/\\D/g, '')`) === String(eng), eng);

// Companies
await go('/companies', 1800);
check('companies page lists the hiring partners', await js(`document.querySelectorAll('.company-card').length`) === companies.length, companies.length);
check('companies: space between the search box and the grid', await js(`document.querySelector('.company-grid').getBoundingClientRect().top - document.querySelector('.company-search').getBoundingClientRect().bottom`) >= 16);
await js(`document.querySelectorAll('.company-logo img').forEach(i => i.loading = 'eager')`);
await wait(`[...document.querySelectorAll('.company-card .company-logo img')].every(i => i.complete)`, 8000);
const withLogo = companies.filter((c) => logos[c.id]).length;
check('companies: every self-hosted logo loads', await js(`[...document.querySelectorAll('.company-card .company-logo img')].filter(i => i.naturalWidth > 0).length`) === withLogo, withLogo);
check('companies: the rest keep their initials', await js(`[...document.querySelectorAll('.company-card .company-logo:not(.company-logo--img)')].every(l => /^[A-Z0-9]{1,2}$/.test(l.textContent))`) === true);
check('logos sit on a white tile', await js(`getComputedStyle(document.querySelector('.company-logo--img')).backgroundColor`) === 'rgb(255, 255, 255)');
await shot('j-companies-light.png');
await js(`localStorage.setItem('kola:theme','dark')`); await go('/companies', 1800);
await js(`document.querySelectorAll('.company-logo img').forEach(i => i.loading = 'eager')`); await sleep(1200);
await shot('j-companies-dark.png');
await js(`localStorage.setItem('kola:theme','light')`);
await go(`/companies/${rich.companyId}`, 1800);
check('company page lists its jobs', await js(`document.querySelectorAll('.job-card').length`) === jobs.filter((j) => j.companyId === rich.companyId).length);

// Saved
await js(`localStorage.setItem('kola:saved-jobs', JSON.stringify([${JSON.stringify(rich.id)}]))`);
await go('/saved', 1800);
check('saved page shows the saved job', await js(`document.querySelectorAll('.results-list .job-card').length`) === 1);
check('no runtime errors or React warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
