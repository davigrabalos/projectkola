// The app on real data, end to end, against a running Worker:
//   npm run build && npm run dev:api   (then run a few ingests, see README)   then   npm run e2e:real
import { start, sleep } from './harness.mjs';

const baseUrl = process.env.APP_URL ?? 'http://localhost:8787';
const { send, evaluate: js, go, shot, check, errors, finish } = await start('real-data', { baseUrl, debugPort: 9352 });
const wait = async (expr, ms = 6000) => { for (let t = 0; t < ms; t += 150) { if (await js(expr)) return true; await sleep(150); } return false; };
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));

// Home: real stats, category tiles, latest jobs, ranked deals
await go('/', 400); await js(`localStorage.clear(); localStorage.setItem('kola:theme','dark')`); await go('/', 2500);
const stats = await js(`[...document.querySelectorAll('.stats strong')].map(e => e.textContent)`);
check('home stats come from the API', num(stats[0]) > 1000 && num(stats[1]) >= 30, stats.join(' / '));
check('category tiles show live counts', await js(`[...document.querySelectorAll('.tile__count')].every(e => /\\d/.test(e.textContent))`));
check('latest jobs are real, with companies', await js(`(() => { const c = [...document.querySelectorAll('.job-grid .job-card')]; return c.length === 6 && c.every(x => x.querySelector('.job-card__company').textContent.trim()); })()`));
check('3 bespoke deals with a match score', await wait(`document.querySelectorAll('.card.glass .tag--brand').length >= 3`) && await js(`[...document.querySelectorAll('.card.glass .tag--brand')].slice(0,3).every(t => /^\\d+% Profile Match$/.test(t.textContent))`));
await js(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('View Full Deal Analysis')).click()`); await sleep(600);
check('deal analysis explains the score and links out', await js(`(() => { const d = document.querySelector('.drawer'); const a = d?.querySelector('a[target=_blank]'); return !!d && /Skills in common/.test(d.textContent) && a?.href.startsWith('https://'); })()`));
await shot('r-home-deal.png');
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);

// Jobs: server paging, filters, preview with the full description
await go('/jobs', 2500);
const total = num(await js(`document.querySelector('#results-heading strong').textContent`));
check('jobs page shows the real total', total > 1000, total);
check('first page has 20 cards', await js(`document.querySelectorAll('.results-list .job-card').length`) === 20);
check('preview loads the full description', await wait(`(document.querySelector('.job-preview .job-description')?.textContent.length ?? 0) > 200`, 10000));
check('apply opens the employer site in a new tab', await js(`(() => { const a = document.querySelector('.job-preview .job-detail__actions a.btn--primary'); return a && a.target === '_blank' && a.rel.includes('noopener') && a.href.startsWith('https://') && /Apply on/.test(a.textContent); })()`));
check('source note links to the original posting', await js(`!!document.querySelector('.job-preview .source-note a[href^="https://"]')`));
await shot('r-jobs.png');
const y0 = await js(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'Show more jobs'); b.scrollIntoView({ block: 'center' }); return Math.round(scrollY); })()`);
await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Show more jobs').click()`);
check('show more appends the next 20', await wait(`document.querySelectorAll('.results-list .job-card').length === 40`));
check('scroll position kept after loading more', Math.abs((await js(`Math.round(scrollY)`)) - y0) < 5, `${y0} -> ${await js('Math.round(scrollY)')}`);
check('"Showing 40 of N"', await js(`/Showing 40 of/.test(document.querySelector('.load-more').textContent)`));
const easy = await js(`[...document.querySelectorAll('.filters label')].some(l => /Easy apply/.test(l.textContent))`);
check('easy-apply filter hidden for real jobs', !easy);
check('category options carry counts', await js(`[...document.querySelectorAll('.filters select option')].some(o => /\\(\\d[\\d,]*\\)$/.test(o.textContent))`));

await go('/jobs?category=Data&mode=remote', 2500);
check('URL filters reach the API', await js(`(() => { const n = Number(document.querySelector('#results-heading strong').textContent.replace(/\\D/g, '')); return n > 0 && n < ${total}; })()`));
check('active filter chips shown', await js(`document.querySelectorAll('.active-filters .chip').length`) === 2);
await go('/jobs?q=react', 2500);
check('search: React roles first', await js(`/react/i.test(document.querySelector('.results-list .job-card__title').textContent)`));
await go('/jobs?q=zzzqqqxx', 2000);
check('no results shows the empty state', await js(`!!document.querySelector('.empty-state .illo')`));

// Job page, applied flow
await go('/jobs', 2000);
const href = await js(`document.querySelector('.results-list .job-card__title a').getAttribute('href')`);
await go(href, 3000);
check('job page renders the description', await wait(`(document.querySelector('.job-description')?.textContent.length ?? 0) > 200`, 10000));
check('similar jobs listed', await js(`document.querySelectorAll('aside .job-card').length`) > 0);
await js(`document.querySelector('.job-detail__actions a.btn--primary').addEventListener('click', e => e.preventDefault(), { once: true })`);
await js(`document.querySelector('.job-detail__actions a.btn--primary').click()`);
await js(`window.dispatchEvent(new Event('focus'))`); await sleep(400);
check('"Did you apply?" asked on return', await js(`/Did you apply/.test(document.querySelector('.toast-region')?.textContent ?? '')`));
await js(`[...document.querySelectorAll('.toast__action')].find(b => /mark applied/.test(b.textContent)).click()`); await sleep(300);
check('marked as applied', await js(`/Applied/.test(document.querySelector('.job-detail__actions a.btn--primary').textContent)`));
await shot('r-job.png');

// Companies, saved
await go('/companies', 2500);
check('34 curated companies with open-job counts', await js(`(() => { const c = [...document.querySelectorAll('.company-card')]; return c.length === 34 && c.every(x => /\\d+ open job/.test(x.textContent)); })()`));
await go('/companies/feedzai', 2500);
check('company page lists its jobs', await js(`document.querySelectorAll('.job-card').length`) > 0);
const savedId = href.split('/').pop();
await js(`localStorage.setItem('kola:saved-jobs', JSON.stringify([${JSON.stringify(savedId)}, 'gh-1']))`);
await go('/saved', 2500);
check('saved page shows the saved real job', await js(`document.querySelectorAll('.results-list .job-card').length`) === 1);
check('closed saved jobs are reported', await js(`/1 saved job has closed/.test(document.body.textContent)`));

// Phones
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go('/jobs', 2500);
check('no horizontal scroll at 390px', await js(`document.documentElement.scrollWidth <= innerWidth`));
await shot('r-jobs-mobile.png');
check('no runtime errors or React warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
