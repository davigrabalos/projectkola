// Home: hero above the fold, rotating city, live shortlist (cycling, pause, keys, match ring = drawer score),
// signed-out variant, reduced motion, phones, no long tasks.
import { start, sleep } from './harness.mjs';
const { send, evaluate: js, go, shot, check, errors, finish } = await start('home', { debugPort: 9353 });
const desktop = () => send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 813, deviceScaleFactor: 1, mobile: false });
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const key = (k) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 37 });
const frontTitle = `document.querySelector('.shortlist__card[data-pos="0"] .shortlist__title').textContent`;

await desktop();
await go('/', 300); await js(`localStorage.clear(); localStorage.setItem('kola:theme','dark')`); await go('/', 2200);
await move(5, 805);

// Above the fold, two-line headline with a fixed accessible name
check('search box above the fold at 1440x813', await js(`document.querySelector('.hero__search').getBoundingClientRect().bottom < innerHeight`));
check('headline is two lines', await js(`(() => { const h = document.querySelector('.hero h1'); return h.getBoundingClientRect().height < parseFloat(getComputedStyle(h).fontSize) * 2.4; })()`));
check('headline has a fixed accessible name', await js(`(() => { const h = document.querySelector('.hero h1'); return h.querySelector('.visually-hidden').textContent === 'Your next role, in Europe or Brazil.' && h.querySelector('.rotating-word').closest('[aria-hidden="true"]') !== null; })()`));
const city0 = await js(`document.querySelector('.rotating-word__item[data-state="in"]').textContent`);
await sleep(2900);
const city1 = await js(`document.querySelector('.rotating-word__item[data-state="in"]').textContent`);
check('city rolls to the next one', city0 === 'Lisbon.' && city1 === 'Berlin.', `${city0} -> ${city1}`);
check('signed-in pill greets by name', await js(`/^Hi Alex · /.test(document.querySelector('.hero__badge').textContent)`));
await shot('h-desk-dark.png');

// Shortlist
check('shortlist shows 3 cards with match rings', await js(`document.querySelectorAll('.shortlist__card').length === 3 && document.querySelectorAll('.shortlist .ring').length === 3`));
check('back cards are inert and hidden from screen readers', await js(`[...document.querySelectorAll('.shortlist__card:not([data-pos="0"])')].every(c => c.hasAttribute('inert') && c.getAttribute('aria-hidden') === 'true')`));
const t0 = await js(frontTitle);
await sleep(5300);
const t1 = await js(frontTitle);
check('front card cycles after 5 s', t0 !== t1, `${t0} -> ${t1}`);
check('the old front card swings to the back', await js(`(() => { const c = document.querySelector('.shortlist__card[data-leaving]'); return !!c && c.dataset.pos === '2' && getComputedStyle(c).animationName === 'kola-to-back'; })()`));
const box = JSON.parse(await js(`JSON.stringify(document.querySelector('.shortlist__card[data-pos="0"]').getBoundingClientRect())`));
await move(box.x + box.width / 2, box.y + box.height / 2); await sleep(5600);
check('hover pauses cycling', (await js(frontTitle)) === t1);
check('pointer tilts the stack', await js(`getComputedStyle(document.querySelector('.shortlist__stack')).transform !== 'none'`));
await move(5, 805);
await js(`document.querySelector('.shortlist__pause').click()`); await js(`document.activeElement.blur()`);
await sleep(5600);
check('pause button stops cycling', (await js(frontTitle)) === t1 && (await js(`document.querySelector('.shortlist__pause').getAttribute('aria-label')`)) === 'Play rotation');
await js(`document.querySelector('.shortlist__pause').click()`); await js(`document.activeElement.blur()`);
await js(`document.querySelector('.shortlist__card[data-pos="0"] .shortlist__title button').focus()`);
await key('ArrowRight'); await sleep(250);
check('arrow key brings the next card forward', (await js(frontTitle)) !== t1);
check('focus follows the new front card', await js(`document.activeElement.closest('.shortlist__card')?.dataset.pos === '0'`));
check('dots track the front card', await js(`[...document.querySelectorAll('.shortlist__dot')].filter(d => d.getAttribute('aria-current') === 'true').length === 1`));
const ring = await js(`document.querySelector('.shortlist__card[data-pos="0"] .ring').getAttribute('aria-label')`);
await js(`document.querySelector('.shortlist__card[data-pos="0"] .shortlist__title button').click()`); await sleep(600);
check('front card opens the deal analysis with the same score', await js(`document.querySelector('.drawer .tag--brand')?.textContent`) === `${parseInt(ring)}% Profile Match`, ring);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(400);
check('"Just posted" does not repeat the hero jobs', await js(`(() => { const hero = new Set([...document.querySelectorAll('.shortlist__title')].map(e => e.textContent)); const cards = [...document.querySelectorAll('.job-grid .job-card__title')]; return cards.length > 0 && cards.every(e => !hero.has(e.textContent)); })()`));

// No long tasks while the hero animates
const longTasks = await js(`new Promise((res) => { const f = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => f.push(Math.round(e.duration)))); po.observe({ type: 'longtask' }); setTimeout(() => { po.disconnect(); res(f.join(',')); }, 6000); })`);
check('no long tasks while the hero cycles', longTasks === '', longTasks);

// Light theme
await js(`localStorage.setItem('kola:theme','light')`); await go('/', 2200); await move(5, 805);
await shot('h-desk-light.png');

// Signed out. Sign Out goes to /sign-in; come back through the logo (a reload would restore the demo profile).
await js(`document.querySelector('.agent-pill').click()`); await sleep(300);
await js(`[...document.querySelectorAll('.agent-dropdown button')].find(b => /Sign Out/.test(b.textContent)).click()`); await sleep(800);
await js(`document.querySelector('.site-header a[href="/"]').click()`); await sleep(1800);
check('signed out and back on Home', await js(`location.pathname === '/' && !!document.querySelector('.hero')`));
check('signed out: pill shows the live count', await js(`/^Live · [\\d,]+ open roles/.test(document.querySelector('.hero__badge').textContent)`));
check('signed out: newest jobs, no match ring, link to the job', await js(`(() => { const c = [...document.querySelectorAll('.shortlist__card')]; return c.length === 3 && !document.querySelector('.shortlist .ring') && c.every(x => x.querySelector('.shortlist__title a')?.getAttribute('href').startsWith('/jobs/')); })()`));
check('signed out: sign-in hint on the cards', await js(`/Sign in to see your match/.test(document.querySelector('.shortlist__card[data-pos="0"] .shortlist__foot').textContent)`));
check('signed out: closing band invites to build a profile', await js(`/See which jobs fit you/.test(document.querySelector('.cta-band').textContent)`));
await shot('h-desk-light-signed-out.png');

// Reduced motion
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await go('/', 2200);
const rm0 = await js(frontTitle);
check('reduced motion: city is still', await js(`getComputedStyle(document.querySelector('.rotating-word__still')).display !== 'none' && [...document.querySelectorAll('.rotating-word__item')].every(e => getComputedStyle(e).display === 'none')`));
check('reduced motion: no pause button, no ring animation', await js(`!document.querySelector('.shortlist__pause') && getComputedStyle(document.querySelector('.ring')).animationName === 'none'`));
await sleep(5500);
check('reduced motion: no cycling', (await js(frontTitle)) === rm0);
await send('Emulation.setEmulatedMedia', { features: [] });

// Phone
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go('/', 2200);
check('phone: search box above the fold', await js(`document.querySelector('.hero__search').getBoundingClientRect().bottom < innerHeight`));
check('phone: pill fits on one line', await js(`document.querySelector('.hero__badge').getBoundingClientRect().height < 32`));
check('phone: shortlist is a swipeable row, nothing inert', await js(`(() => { const s = document.querySelector('.shortlist__stack'); return s.scrollWidth > s.clientWidth && !document.querySelector('.shortlist__card[inert]') && !document.querySelector('.shortlist__controls'); })()`));
check('phone: no horizontal page scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
await shot('h-phone.png');
check('no runtime errors or React warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
