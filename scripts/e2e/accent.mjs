// Personal accent: defaults per theme, picking from the agent menu, pre-paint cache, keyboard, custom colour, contrast, sign-out.
import { start, sleep } from './harness.mjs';

const { send, evaluate, go, shot, check, errors, finish } = await start('accent', { debugPort: 9334 });
const js = evaluate;
const brand = () => js(`getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()`);
const cs = (sel, prop, pseudo = null) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? getComputedStyle(e, ${JSON.stringify(pseudo)})[${JSON.stringify(prop)}] : 'missing'; })()`);

// 1. Defaults
await go('/'); await js(`localStorage.clear()`); await go('/');
check('default accent is Kola cyan (dark)', (await brand()) === '#2CAED4', await brand());
check('page background is graphite', (await cs('body', 'backgroundColor')) === 'rgb(21, 22, 23)', await cs('body', 'backgroundColor'));
check('text is off-white', (await cs('body', 'color')) === 'rgb(237, 235, 230)', await cs('body', 'color'));
check('button radius 8px', (await cs('.btn', 'borderRadius')) === '8px', await cs('.btn', 'borderRadius'));
check('card radius 12px', (await cs('.card', 'borderRadius')) === '12px', await cs('.card', 'borderRadius'));
check('reveal border follows the radius', (await cs('.card.reveal', 'borderRadius', '::before')) === '12px', await cs('.card.reveal', 'borderRadius', '::before'));
check('hero search radius 16px', (await cs('.search-bar', 'borderRadius')) === '16px');
await shot('acc-home-dark.png');
await js(`document.querySelector('.job-grid').scrollIntoView()`); await sleep(500); await shot('acc-home-dark-cards.png');
await js(`localStorage.setItem('kola:theme','light')`); await go('/');
check('light background is off-white', (await cs('body', 'backgroundColor')) === 'rgb(245, 243, 239)', await cs('body', 'backgroundColor'));
check('default accent (light) is the darker cyan', (await brand()) === '#00718D', await brand());
await shot('acc-home-light.png');
await js(`localStorage.setItem('kola:theme','dark')`);

// 2. Pick a colour from the island's agent menu: saved at once, cached for pre-paint
await go('/');
await js(`document.querySelector('.agent-pill').click()`); await sleep(250);
check('menu shows 10 presets + custom', (await js(`document.querySelectorAll('.agent-dropdown .accent-swatch').length`)) === 11);
await js(`document.querySelector('.agent-dropdown input[type=radio][value="#EE46A2"]').click()`); await sleep(200);
check('pink re-tints the page live', (await brand()) === '#FC54AE', await brand());
check('legend names the choice', (await js(`document.querySelector('.agent-dropdown .accent-picker__name').textContent`)) === '· Pink');
check('profile stores the colour', (await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`)) === '#EE46A2');
check('pre-paint cache stored', (await js(`JSON.parse(localStorage.getItem('kola:accent'))['--accent-d']`)) === '#FC54AE');

// 3. Pre-paint: block the app bundle, only the inline script in index.html runs
await send('Network.setBlockedURLs', { urls: ['*/assets/*.js'] });
await go('/jobs', 800);
check('inline script applies the accent before the app loads', (await brand()) === '#FC54AE', await brand());
await send('Network.setBlockedURLs', { urls: [] });

// 4. Light theme follows the pick
await go('/jobs');
await js(`document.querySelector('.theme-toggle').click()`); await sleep(600);
check('pink in light theme uses the darker shade', (await brand()) === '#BB0077', await brand());
await shot('acc-jobs-pink-light.png');
await js(`document.querySelector('.theme-toggle').click()`); await sleep(600);

// 5. Profile menu: change again later
await js(`document.querySelector('.agent-pill').click()`); await sleep(200);
check('profile menu has the picker', await js(`!!document.querySelector('.agent-dropdown .accent-picker')`));
await js(`document.querySelector('.agent-dropdown input[type=radio][value="#2FBBB4"]').click()`); await sleep(200);
check('menu pick saves immediately (teal)', (await brand()) === '#24B5AE' && (await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`)) === '#2FBBB4', await brand());
await shot('acc-menu.png', { x: 1440 - 520, y: 0, width: 520, height: 720 });
// keyboard: arrow key moves to the next preset (native radio group)
await js(`document.querySelector('.agent-dropdown input[type=radio][value="#2FBBB4"]').focus()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 }); await sleep(200);
check('arrow keys move between swatches', (await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`)) === '#85B829', await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`));
// custom colour: drag (input) previews, closing the dialog (change) saves
await js(`(() => { const c = document.querySelector('.agent-dropdown input[type=color]'); c.value = '#e04050'; c.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(150);
const dragBrand = await brand();
const savedDuringDrag = await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`);
check('custom drag previews without saving', dragBrand !== '#7FB11E' && savedDuringDrag === '#85B829', `${dragBrand} / saved ${savedDuringDrag}`);
await js(`(() => { const c = document.querySelector('.agent-dropdown input[type=color]'); c.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(200);
check('custom colour saved on close', (await js(`JSON.parse(localStorage.getItem('kola:agent_user_session')).accentColor`)) === '#E04050');
check('legend shows the custom colour', (await js(`document.querySelector('.agent-dropdown .accent-picker__name').textContent`)) === '· Custom #E04050');
const btnContrast = await js(`(() => {
  const lum = (c) => { const [r,g,b] = c.match(/\\d+/g).slice(0,3).map(v => { v/=255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*b; };
  const b = document.querySelector('.btn--primary'); const s = getComputedStyle(b);
  const [x,y] = [lum(s.backgroundColor), lum(s.color)].sort((p,q)=>q-p); return ((x+0.05)/(y+0.05)).toFixed(2); })()`);
check('primary button text contrast with custom red ≥ 4.5', Number(btnContrast) >= 4.5, btnContrast);

// 6. Sign out resets to Kola cyan
await js(`[...document.querySelectorAll('.agent-dropdown button')].find(b => b.textContent.includes('Sign Out')).click()`); await sleep(500);
check('signing out goes back to Kola cyan', (await brand()) === '#2CAED4', await brand());

// 7. Mobile
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go('/');
check('no horizontal scroll on mobile', await js(`document.documentElement.scrollWidth <= innerWidth`));
await shot('acc-home-mobile.png');
await send('Emulation.clearDeviceMetricsOverride');

check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
