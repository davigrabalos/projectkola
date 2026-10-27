// Onboarding quest: validation, XP and badges, URL steps, vault, accent preview, launch, draft lifecycle, sign-in tab.
import { start, sleep } from './harness.mjs';

const { send, evaluate, go, shot, check, errors, finish } = await start('quest', { debugPort: 9337 });
const H = `const $ = (s) => document.querySelector(s); const $$ = (s) => [...document.querySelectorAll(s)];
  const fill = (el, v) => { const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const btn = (t) => $$('button').find(b => b.textContent.trim().startsWith(t));
  const xp = () => Number($('.agent-sheet .xp__bar').getAttribute('aria-valuenow'));`;
const js = (expr) => evaluate(`(async () => { ${H}\n${expr} })()`);

await go('/'); await js(`localStorage.clear()`); await go('/sign-in');
check('quest map has 7 steps', (await js(`return $$('.quest-node').length`)) === 7);
check('starts at Identity with 0 XP', (await js(`return $('#quest-step-title').textContent + ' ' + xp()`)) === 'Create your agent 0');
await shot('q-1-identity.png');

// Validation
await js(`btn('Continue').click()`); await sleep(150);
check('empty Continue shows errors', (await js(`return $$('.quest-card .field__error').length`)) >= 3);
check('focus moves to the first invalid field', (await js(`return document.activeElement.name`)) === 'name');

await js(`fill($('input[name=name]'), 'Ada Lovelace'); fill($('input[name=email]'), 'ada@example.com'); fill($('#ob-password'), 'Analytical-Engine-1843');`); await sleep(250);
check('identity earns 10 XP', (await js(`return xp()`)) === 10);
check('XP gain floater appears', await js(`return !!$('.agent-sheet .xp__gain')`));
check('badge unlock toast: First steps', (await js(`return $('.unlock')?.textContent ?? ''`)).includes('First steps'));
check('strength meter shows excellent', (await js(`return $('.strength').className`)).includes('strength--4'));
await js(`btn('Continue').click()`); await sleep(500);
check('URL moves to step=track', (await js(`return location.search`)).includes('step=track'));
check('focus on new step heading', (await js(`return document.activeElement.id`)) === 'quest-step-title');

// Track
await js(`$('input[name=careerType][value=design]').click()`); await sleep(150);
check('track card selected', await js(`return $('.track-card.is-on')?.textContent.includes('Design')`));
await shot('q-2-track.png');
await js(`btn('Continue').click()`); await sleep(500);

// Background
await js(`fill($('input[autocomplete=organization-title]'), 'Lead Product Designer'); $$('input[name=seniority]')[2].click();`); await sleep(100);
await js(`fill($('#ob-role-title'), 'Product Designer'); fill($('input[aria-label=Company]'), 'Orbit Finance'); fill($('input[aria-label="Start year"]'), '2019'); fill($('input[aria-label="End year"]'), '2022');`); await sleep(50);
await js(`key($('input[aria-label=Company]'), 'Enter')`); await sleep(150);
check('Enter in role fields adds a role (not next step)', (await js(`return $$('.timeline__item').length + ' ' + location.search`)) === '1 ?step=background');
await js(`fill($('#ob-role-title'), 'Lead Designer'); fill($('input[aria-label=Company]'), 'Lumen Labs'); fill($('input[aria-label="Start year"]'), '2022');`); await sleep(50);
await js(`$('.role-form input[type=checkbox]').click()`); await sleep(50);
await js(`btn('Add role').click()`); await sleep(150);
check('second role, newest first, "Present"', (await js(`return $$('.timeline__body')[0].textContent`)).includes('Present'));
check('Storyteller badge unlocked', await js(`return $$('.badge.is-on').some(b => b.textContent.includes('Storyteller'))`));
await js(`const i = $('#ob-skills'); fill(i, 'Figma'); key(i, 'Enter');`); await sleep(80);
await js(`const i = $('#ob-skills'); fill(i, 'Design systems,'); key(i, ',');`); await sleep(80);
await js(`$$('.suggest__chip').slice(0, 4).forEach(b => b.click())`); await sleep(150);
check('6 skills added (typed + suggested)', (await js(`return $$('.skill-input__box .chip').length`)) === 6);
check('background step loot full', await js(`return $('.loot').classList.contains('is-full')`));
await shot('q-3-background.png');
await js(`btn('Continue').click()`); await sleep(500);

// Browser back/forward between steps
await js(`history.back()`); await sleep(500);
check('browser Back returns to previous step', (await js(`return $('#quest-step-title').textContent`)) === 'Your work background');
await js(`history.forward()`); await sleep(500);
check('browser Forward goes to deal terms', (await js(`return $('#quest-step-title').textContent`)) === 'Set your deal terms');

// Preferences
check('pay range defaulted from Senior level', (await js(`return $('.comp__value').textContent`)) === '$140k – $200k');
await js(`$$('input[name=workMode]')[0].click(); const r = $$('.range2 input'); fill(r[1], '230000');`); await sleep(100);
check('max slider updates pay', (await js(`return $('.comp__value').textContent`)) === '$140k – $230k');
await js(`$$('.powerup').slice(0, 3).forEach(b => b.click())`); await sleep(100);
check('4th power-up disabled at 3/3', await js(`return $$('.powerup')[3].disabled && $('.powerups__count').textContent === '3/3'`));
await shot('q-4-terms.png');
await js(`btn('Continue').click()`); await sleep(500);

// Vault
await js(`const dt = new DataTransfer(); dt.items.add(new File(['x'.repeat(2048)], 'resume.exe', { type: 'application/octet-stream' })); const f = $('.dropzone input[type=file]'); f.files = dt.files; f.dispatchEvent(new Event('change', { bubbles: true }));`); await sleep(100);
check('wrong file type rejected', (await js(`return $('.quest-card .field__error')?.textContent ?? ''`)).includes('not supported'));
await js(`const dt = new DataTransfer(); dt.items.add(new File(['x'.repeat(48000)], 'Ada_Lovelace_CV.pdf', { type: 'application/pdf' })); const f = $('.dropzone input[type=file]'); f.files = dt.files; f.dispatchEvent(new Event('change', { bubbles: true }));`); await sleep(300);
check('CV scan in progress', await js(`return !!$('.dropzone.is-scanning')`));
await shot('q-5-scanning.png');
await sleep(1300);
check('CV archived as a file card', (await js(`return $('.file-card')?.textContent ?? ''`)).includes('Ada_Lovelace_CV.pdf'));
await js(`fill($('input[placeholder="linkedin.com/in/your-name"]'), 'linkedin.com/in/ada-lovelace'); fill($('input[placeholder="github.com/your-name"]'), 'adalovelace'); fill($('input[placeholder="yoursite.com"]'), 'ada.dev');`); await sleep(200);
check('all 4 vault slots filled', (await js(`return $$('.slot.is-filled').length`)) === 4);
check('Full vault badge', await js(`return $$('.badge.is-on').some(b => b.textContent.includes('Full vault'))`));
await js(`$('input[placeholder="linkedin.com/in/your-name"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true }))`); await sleep(100);
check('LinkedIn normalised on blur', (await js(`return $('input[placeholder="linkedin.com/in/your-name"]').value`)) === 'https://www.linkedin.com/in/ada-lovelace');
await shot('q-6-vault.png');
await js(`btn('Continue').click()`); await sleep(500);

// Style
await js(`$('.style-step input[type=radio][value="#A457EF"]').click()`); await sleep(150);
check('violet previews live', (await js(`return getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()`)) === '#B979FF');
check('XP at 100 / Legend', (await js(`return xp() + ' ' + $('.agent-sheet .xp__rank').textContent`)) === '100 Legend');
await shot('q-7-style.png');
await js(`btn('Continue').click()`); await sleep(500);

// Launch
await shot('q-8-launch.png');
await js(`btn('Launch my agent').click()`); await sleep(200);
check('launch requires consent', (await js(`return $('#err-agreed')?.textContent ?? ''`)).includes('accept'));
await js(`$('.consent input').click()`); await sleep(100);
await js(`btn('Launch my agent').click()`); await sleep(900);
check('launch overlay shows', await js(`return !!$('.launch-overlay [role=dialog]')`));
await shot('q-9-launching.png');
await sleep(2500);
check('lands on deals after launch', (await js(`return location.pathname`)) === '/jobs');
const u = await js(`return JSON.parse(localStorage.getItem('kola:agent_user_session'))`);
check('profile saved with quest data', u && u.name === 'Ada Lovelace' && u.careerType === 'design' && u.roles.length === 2 && u.skills.length === 6 && u.accentColor === '#A457EF' && u.profileStrength === 100 && u.linkedinUrl === 'https://www.linkedin.com/in/ada-lovelace', JSON.stringify({ n: u?.name, s: u?.profileStrength, m: u?.matchScore, c: u?.connectedSources }));
check('password never stored', !(await js(`return JSON.stringify({ ...localStorage })`)).includes('Analytical-Engine'));
check('draft cleared after launch', (await js(`return localStorage.getItem('kola:onboarding-draft')`)) === null);
check('accent kept after launch', (await js(`return getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()`)) === '#B979FF');

// Draft resume
await js(`localStorage.removeItem('kola:agent_user_session')`);
await go('/sign-in?step=identity');
await js(`fill($('input[name=name]'), 'Grace Hopper'); fill($('input[name=email]'), 'grace@example.com');`); await sleep(600);
await go('/sign-in');
check('draft restored after reload', (await js(`return $('input[name=name]').value`)) === 'Grace Hopper');
check('asks to retype password after restore', (await js(`return $('#hint-password').textContent`)).includes('never saved'));
await js(`btn('Start over').click()`); await sleep(200);
check('Start over clears, Undo offered', (await js(`return $('input[name=name]').value === '' && !!$('.toast__action')`)));
await js(`$('.toast__action').click()`); await sleep(200);
check('Undo restores the draft', (await js(`return $('input[name=name]').value`)) === 'Grace Hopper');

// Sign-in mode
await js(`$$('.mode-switch button')[1].click()`); await sleep(400);
check('sign-in tab', (await js(`return location.search + ' ' + document.title`)).includes('mode=login'));
await js(`$('.signin__card button[type=submit]').click()`); await sleep(150);
check('sign-in validates', (await js(`return $$('.signin__card .field__error').length`)) === 2);
await shot('q-10-signin.png');
await js(`$$('.demo-agent')[2].click()`); await sleep(600);
check('demo agent signs in', (await js(`return location.pathname + ' ' + JSON.parse(localStorage.getItem('kola:agent_user_session')).name`)) === '/jobs Dr. Marcus Vance');

// Light + mobile
await js(`localStorage.setItem('kola:theme', 'light')`);
await go('/sign-in?step=identity'); await shot('q-11-light.png');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go('/sign-in?step=identity');
check('no horizontal scroll at 390px', await js(`return document.documentElement.scrollWidth <= innerWidth`), await js(`return document.documentElement.scrollWidth`));
await shot('q-12-mobile.png');
await js(`window.scrollTo(0, 700)`); await sleep(300); await shot('q-13-mobile-scrolled.png');
check('no runtime errors or React warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
finish();
