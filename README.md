# Kola

Career / job-board web app. React 18 + TypeScript + Vite + React Router + Motion, with a Cloudflare Worker
(D1 database + cron) that serves real jobs from company job boards and Adzuna.

```bash
npm install
npm run dev                 # app on http://localhost:5173 (proxies /api to the Worker below)
npm run dev:api             # Worker + local D1 on http://localhost:8787 (also serves the built app)
VITE_USE_MOCK=1 npm run dev # app on bundled fixtures, no Worker needed
npm run build               # type-check app + Worker, production build (the project's check)
npm run test:worker         # unit tests for the ingest adapters and helpers (Node's test runner)
npm run e2e                 # browser suites on the mock-data build: accent, onboarding, illustrations
npm run e2e:api             # API checks against a local Worker with data
npm run e2e:real            # the app on real data, against a local Worker with data
```

## Brand

- **Look:** graphite black and off-white neutrals with one **personal accent**: each user picks a favourite colour when creating their profile (and can change it from the profile menu). Status colours (success, warning, danger, info) never change. Default accent is Kola cyan with a Kola orange companion. Presets are vivid (near the most saturated colour sRGB allows for their hue); the accent engine only lowers lightness/chroma as far as AA contrast needs. Softly rounded corners (`--radius-*`), acrylic glass on chrome surfaces, reveal-highlight borders. Flat backgrounds: no glows, gradient washes or background grid.
- **Accent engine:** `src/lib/accent.ts` turns any seed colour into dark and light shades that pass WCAG AA (4.5:1) on every surface and under button text, and writes them as `--accent-*` variables. `index.html` re-applies the saved ones before first paint.
- **Type and spacing:** borrowed from motion.dev. TASA Orbiter (text and titles) and Geist Mono (labels, numbers), both open-licensed (SIL OFL) and loaded from Google Fonts. 15px body, tight heading tracking, 11px tracked mono kickers, 1200px layout, 48px section rhythm.
- **Motion:** also borrowed from motion.dev. 8px slide-up entrances, a diagonal clip-path wipe on button hover, arrows that nudge the way they point, 1px card lifts with an accent-tinted border, menus that unfold, a sweep under the hero highlight.
- **Logo:** the K<>la wordmark lives in `src/brand/logo-paths.ts`. The `<>` chevrons turn the accent colour on hover.

| What | Where |
|---|---|
| Colours, glass, type, spacing, radius, motion, illustration palette, light theme | `src/styles/tokens.css` |
| Illustrations (unDraw, recoloured to Kola roles, lazy-loaded) | `src/assets/illustrations/`, `src/components/Illustration.tsx` |
| Personal accent (colour math, presets, apply/persist) | `src/lib/accent.ts` |
| Favourite-colour picker | `src/components/AccentPicker.tsx` |
| Name, tagline, microcopy, contact | `src/brand/brand.ts` |
| Glass, reveal highlight, entrance and skeleton effects | `src/styles/effects.css` |

Components only use `var(--…)` tokens. Never hard-code a colour outside `tokens.css`; for translucent accent tints use `rgb(var(--color-brand-rgb) / α)`. Dark graphite is the default theme; light is `[data-theme="light"]`, toggled in the floating island.

## Sign-in and onboarding quest

`/sign-in` is a hub: new people play a seven-level onboarding quest (default), returning members use `?mode=login`.

- **Levels:** Identity, Track, Background (headline, level, role timeline, skills), Deal terms (work style, pay range, up to 3 power-ups), Vault (CV upload + LinkedIn, GitHub, portfolio), Style (signature colour), Review and launch.
- **Game layer:** 100 XP = a complete profile. XP is computed from the answers, never from clicks. Five ranks (Rookie to Legend), eight badges, a "next best move" hint, rank-up burst and unlock toasts. Rules live in `src/lib/onboarding.ts`.
- **UX rules:** the step is in the URL (browser Back works), visited steps can be revisited from the map, Enter continues, errors focus the first problem, optional steps can be skipped, progress autosaves to the device (never the password or file contents), Start over has Undo.
- **Performance:** the page and its stylesheet (`onboarding.css`) are a lazy chunk, prefetched when the browser is idle.
- **Backend TODOs:** CV parsing is simulated from the file name; sign-in and profile creation are mocked in `AuthProvider` (`TODO(api)`).

## Performance rules for effects

- Acrylic (`backdrop-filter`) only on chrome: the nav island, drawers, preview pane, toasts, hero search. Never on every list card.
- Reveal highlight: one passive pointer listener, one rAF update, one element at a time.
- Above-the-fold entrances are CSS (`.anim-rise`), so first paint never waits on JavaScript.
- Motion is loaded with `LazyMotion`: the engine (incl. drag) is a separate chunk loaded after first render. Use `m` from `motion/react-m`, never the full `motion` component.
- View transitions use the browser API directly (`TransitionLink`, `withViewTransition`) instead of React Router's data router, which would add ~13 KB gzipped.
- Every animation respects `prefers-reduced-motion`.

## Data

`src/lib/api.ts` calls the Worker's JSON API under `/api`. With `VITE_USE_MOCK=1` the bundled fixtures answer instead (`src/lib/mock-api.ts`, loaded only in that mode). `src/lib/swr.ts` is a small stale-while-revalidate cache: cached data shows instantly and refreshes in the background, on window focus and when the network returns. Job lists are paged on the server ("Show more" appends); search parameters are the URL's (`src/lib/filter-params.ts`, shared with the Worker).

Real jobs are applied for on the employer's site (or Adzuna's): Kola opens it in a new tab and asks "Did you apply?" when you come back (`src/lib/applied.ts`). The in-app application form remains for easy-apply fixtures; it sends an `Idempotency-Key`, which a real endpoint must honour. Home's "Bespoke deals" rank the newest jobs on your track against your profile (`src/lib/match.ts`: skills, level, work style, pay, track).

## Backend: real jobs (Cloudflare)

One Worker (`worker/`, config in `wrangler.jsonc`) serves the built site, the API and a cron:

| Route | |
|---|---|
| `GET /api/jobs` | `q, where, category, mode, type, level, posted, sort` (same as the site's URL), `cursor`, `limit` (max 50), `ids`. Full-text search (FTS5, stemmed). |
| `GET /api/jobs/:id` | One job. The full description is fetched from the source on first view, sanitised (`worker/sanitize.ts`) and stored. |
| `GET /api/companies`, `/api/companies/:id` | Curated companies with open-job counts; one company with its jobs. |
| `GET /api/meta` | Totals and categories. |
| `POST /api/admin/ingest` | Runs one ingest now. Only when `ADMIN_TOKEN` is set (`Authorization: Bearer …`). |

**Sources** (`worker/sources.ts`): 34 curated companies' public Greenhouse/Lever boards (no key) plus Adzuna for 7 markets (needs `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`; skipped without them). Only jobs in Europe or Brazil are kept. Add a company with one line in `BOARDS`.

**Ingest** (`worker/ingest/`): a cron every 15 minutes handles 3 sources in rotation, writes only jobs that changed (D1 counts every written row), closes jobs that left a board, and expires feed jobs after 30 days. Parsing one large board takes ~7-10 ms CPU warm and ~50 ms cold, so **the cron needs the Workers Paid plan** ($5/month; the Free plan allows 10 ms per cron run). The site and API fit the Free plan.

**Local:** `cp .dev.vars.example .dev.vars`, `npm run db:migrate:local`, `npm run build`, `npm run dev:api`, then load data with `curl -X POST -H "Authorization: Bearer local-dev-token" localhost:8787/api/admin/ingest` (repeat ~12 times for every board) or `curl "localhost:8787/__scheduled?cron=*/15+*+*+*+*"`.

**Deploy:** `npm run deploy` builds, deploys and applies migrations. The first deploy creates the `kola` D1 database by itself (the config has no `database_id`; wrangler finds the database by name). From GitHub (Workers Builds): set the deploy command to `npm run deploy`. From your machine: `npx wrangler login` first. Secrets: `ADMIN_TOKEN` (enables `POST /api/admin/ingest` to load jobs right away), `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (optional), set with `npx wrangler secret put` or in the dashboard. `npx wrangler tail` watches the cron.

**Terms that apply:** every job links back to its original posting. Adzuna jobs carry a "Jobs by Adzuna" label and are applied for through Adzuna's redirect link; Adzuna's predicted salaries are not shown. Adzuna's commercial use needs a licence after a 14-day trial: contact Adzuna before launching publicly. LinkedIn and Indeed have no open job-listing APIs, and scraping them breaks their terms, so they are not sources.

## UX conventions (borrowed from LinkedIn / Indeed / Glassdoor)

- "What + Where" search; `/` focuses it. Filters live in the URL, with removable chips and "Clear all".
- Desktop split view (list + preview); mobile filter drawer with "Show N jobs", swipe to dismiss.
- Navigation is a **floating island** (`Header.tsx`, "Floating island" in `components.css`): a glass capsule fixed near the top on every screen size. Full labels at the top of the page; after scrolling it condenses to icons and re-expands on hover or keyboard focus (an IntersectionObserver sentinel, no scroll listener). Icons magnify like a dock on pointer devices, the current page gets a dock dot, Saved shows an app-style badge. The avatar opens the agent menu (persona, accent, data, sign out); Escape closes it. Pages reserve `--header-offset` at the top.
- Skeletons only after 300 ms; Undo toasts instead of confirm dialogs; sticky Apply bar on mobile.
- Touch targets ≥ 48 px on touch screens; safe-area insets for notches and home indicators.

## Illustrations

From [unDraw](https://undraw.co) (free for commercial use, no attribution required; the licence forbids redistributing them as a pack or using them for AI training, so only the ones in use are kept here). Each SVG was minified with svgo and its fixed unDraw palette replaced by role classes (`.ia` accent, `.ib` accent tint, `.ik` ink, `.ig` soft ink, `.il` line, `.is` shade, `.it` tint, `.ip` paper, `.jk` ink stroke). The `--illo-*` tokens colour those roles per theme, so the art follows the user's accent. Skin tones are kept as drawn.

To add one: download it from unDraw, run it through svgo with `convertColors` off, swap its hex colours for the role classes above, save it in `src/assets/illustrations/`, and add its viewBox ratio to `RATIOS` in `Illustration.tsx`.

Used in: home hero (`ai-personal-assistant`), 404, empty search/saved/companies/company jobs, jobs load error, and one per onboarding level.

**Motion** is CSS only (no JavaScript per frame): accent parts pop in the first time an illustration scrolls into view; the hero floats while visible and has a gentle scroll parallax (CSS scroll-driven animation, static where unsupported); hero and empty-state art lean toward the pointer (`data-tilt`, fed by the page's one pointer listener in `useRevealHighlight`); onboarding art pops on every XP gain. Presets: `hero`, `empty`, `step`. Everything is off under reduced motion.
