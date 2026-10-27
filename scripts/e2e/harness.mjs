// Minimal end-to-end harness: headless Chrome over the DevTools protocol. No dependencies.
// By default each suite serves the mock-data build (dist-e2e, made by run.mjs) with `vite preview`;
// pass { baseUrl } to test an already running server instead (e.g. `wrangler dev` with real data).
// Each suite gets its own browser profile and exits non-zero on any FAIL.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function start(name, { port = 4179, debugPort = 9340, baseUrl } = {}) {
  const out = process.env.E2E_OUT ?? fs.mkdtempSync(path.join(os.tmpdir(), `kola-e2e-${name}-`));
  fs.mkdirSync(out, { recursive: true });
  const server = baseUrl ? null
    : spawn('npx', ['vite', 'preview', '--outDir', 'dist-e2e', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(out, 'profile')}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* browser still starting */ }
    if (!ws) await sleep(200);
  }
  if (!ws) throw new Error(`Chrome did not start (CHROME_PATH=${CHROME})`);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
      errors.push(d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  /** Evaluates an expression in the page; returns its value, or 'EXC <message>' if it threw. */
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  const base = baseUrl ?? `http://localhost:${port}`;
  const go = async (p, wait = 1700) => { await send('Page.navigate', { url: base + p }); await sleep(wait); };
  const shot = async (file, clip) => {
    const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    fs.writeFileSync(path.join(out, file), Buffer.from(r.result.data, 'base64'));
  };
  let passed = 0;
  let failed = 0;
  const check = (label, ok, extra = '') => {
    ok ? passed++ : failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra !== '' && extra !== undefined ? '  (' + extra + ')' : ''}`);
  };
  const finish = () => {
    console.log(`\n${name}: ${passed} passed, ${failed} failed. Screenshots: ${out}`);
    ws.close(); chrome.kill(); server?.kill();
    process.exit(failed ? 1 : 0);
  };

  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await sleep(250); } }
  return { send, evaluate, go, shot, check, errors, finish, out };
}
