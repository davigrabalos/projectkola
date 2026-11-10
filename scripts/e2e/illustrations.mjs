// Illustration motion: entrance once (when first seen), float (paused off screen), parallax, pointer tilt, XP cheer, reduced motion, no long tasks.
import { start, sleep } from './harness.mjs';
const { send, evaluate: js, go, shot, check, errors, finish } = await start('illustrations', { debugPort: 9351 });
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
// The floating ("hero" preset) illustration lives in Home's closing band.
const art = `document.querySelector('.cta-band__art')`;
const clip = async () => JSON.parse(await js(`(() => { const r = ${art}.getBoundingClientRect(); return JSON.stringify({ x: r.x + scrollX - 20, y: r.y + scrollY - 20, width: r.width + 40, height: r.height + 40 }); })()`));
const toArt = async () => { await js(`${art}.scrollIntoView({ block: 'center' })`); await sleep(1200); };
await go('/'); await js(`localStorage.setItem('kola:theme','dark')`); await go('/', 2200);
check('art waits off screen (not seen yet)', await js(`!${art}.hasAttribute('data-seen')`));
await toArt();
check('art seen + in view', await js(`${art}.hasAttribute('data-seen') && ${art}.hasAttribute('data-in')`));
check('accent parts have stagger index', await js(`[...${art}.querySelectorAll('.ia')].every((e, i) => e.style.getPropertyValue('--n') === String(i))`));
check('accent parts used the pop entrance', await js(`getComputedStyle(${art}.querySelector('.ia')).animationName`) === 'kola-illo-pop');
check('float running while visible', await js(`getComputedStyle(${art}.querySelector('svg')).animationPlayState`) === 'running, running');
await shot('m-art.png', await clip());
// tilt
const r = JSON.parse(await js(`JSON.stringify(${art}.getBoundingClientRect())`));
await move(r.x + r.width * 0.9, r.y + r.height * 0.15); await sleep(700);
check('tilt vars follow the pointer', Number(await js(`${art}.style.getPropertyValue('--tx')`)) > 0.3 && Number(await js(`${art}.style.getPropertyValue('--ty')`)) < -0.2,
  await js(`${art}.style.getPropertyValue('--tx') + ' ' + ${art}.style.getPropertyValue('--ty')`));
check('art is rotated', await js(`getComputedStyle(${art}).transform`) !== 'none');
check('accent parts lift on hover', await js(`getComputedStyle(${art}.querySelector('.ia')).translate`) === '0px -3px');
await shot('m-tilt.png', await clip());
await move(5, r.y + r.height + 60 > 890 ? 5 : r.y + r.height + 60); await sleep(800);
check('tilt resets when pointer leaves', await js(`${art}.style.getPropertyValue('--tx')`) === '');
// parallax (its own view timeline) + pause off screen
const t0 = await js(`getComputedStyle(${art}).translate`);
await js(`window.scrollBy(0, 160)`); await sleep(400);
const t1 = await js(`getComputedStyle(${art}).translate`);
check('parallax moves the art on scroll', t0 !== t1, `${t0} -> ${t1}`);
await js(`window.scrollTo(0, 0)`); await sleep(500);
check('float pauses off screen', await js(`getComputedStyle(${art}.querySelector('svg')).animationPlayState`) === 'running, paused');
// long tasks while scrolling the page
const longTasks = await js(`new Promise((res) => {
  const found = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => found.push(Math.round(e.duration)))); po.observe({ type: 'longtask' });
  window.scrollTo(0, 0); let y = 0; const end = document.documentElement.scrollHeight - innerHeight; const step = () => { y += 24; window.scrollTo(0, y); if (y < end) requestAnimationFrame(step); else setTimeout(() => { po.disconnect(); res(found.join(',')); }, 300); }; requestAnimationFrame(step); })`);
check('no long tasks while scrolling Home', longTasks === '', longTasks);
// 404 empty state tilt-enabled + seen
await go('/nope');
check('404 art is an "empty" preset with tilt', await js(`(() => { const e = document.querySelector('.empty-state__art'); return e.dataset.preset === 'empty' && e.hasAttribute('data-tilt') && e.hasAttribute('data-seen'); })()`));
// onboarding: step preset, cheer on XP gain
await go('/'); await js(`localStorage.removeItem('kola:onboarding-draft')`); await go('/sign-in');
check('step art has no tilt', await js(`(() => { const e = document.querySelector('.quest-card__art'); return e.dataset.preset === 'step' && !e.hasAttribute('data-tilt'); })()`));
const cheered = await js(`new Promise((res) => {
  const art = document.querySelector('.quest-card__art'); let seen = false;
  const mo = new MutationObserver(() => { if (art.hasAttribute('data-cheer')) seen = true; }); mo.observe(art, { attributes: true });
  const input = document.querySelector('#quest-step-title').closest('form').querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Ada Lovelace'); input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  setTimeout(() => { mo.disconnect(); res(seen + ' ' + art.hasAttribute('data-cheer')); }, 900); })`);
check('XP gain makes the level art cheer, then settle', cheered === 'true false', cheered);
// reduced motion
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await go('/', 2200); await toArt();
check('reduced motion: no animation, no transform', await js(`(() => { const a = ${art}; const s = a.querySelector('svg'); const ia = a.querySelector('.ia');
  return getComputedStyle(s).animationName === 'none' && getComputedStyle(ia).animationName === 'none' && getComputedStyle(a).transform === 'none' && getComputedStyle(a).translate === 'none' && getComputedStyle(s).opacity === '1'; })()`));
await send('Emulation.setEmulatedMedia', { features: [] });
// light theme look
await js(`localStorage.setItem('kola:theme','light')`); await go('/', 2200); await toArt();
await shot('m-art-light.png', await clip());
check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
