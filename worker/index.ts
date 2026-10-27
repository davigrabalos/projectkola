import { handleApi } from './api.ts';
import type { Env } from './env.ts';
import { runIngest } from './ingest/run.ts';

/* One Worker: the built site (static assets, single-page-app fallback), the /api routes,
   and the cron that refreshes jobs. Only /api/* runs this code (see run_worker_first in wrangler.jsonc). */

export default {
  fetch(req, env, ctx) {
    if (new URL(req.url).pathname.startsWith('/api/')) return handleApi(req, env, ctx);
    return env.ASSETS.fetch(req);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(runIngest(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
