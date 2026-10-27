// Builds the mock-data copy of the app (dist-e2e, VITE_USE_MOCK=1), then runs every suite in turn.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const build = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-e2e', '--logLevel', 'warn'], {
  cwd: path.resolve(dir, '../..'), stdio: 'inherit', env: { ...process.env, VITE_USE_MOCK: '1' },
});
if (build.status !== 0) process.exit(1);
const suites = ['accent.mjs', 'quest.mjs', 'illustrations.mjs'];
let failed = 0;
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  const r = spawnSync(process.execPath, [path.join(dir, s)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
