/**
 * BRAND CONFIG
 * ------------------------------------------------------------------
 * Every brand-specific string lives here so the identity can be swapped
 * without touching components. Colours, type and shape live in
 * src/styles/tokens.css (CSS custom properties).
 *
 * Fonts: System UI font for clean modern typography; system mono for labels (see tokens.css).
 */
export const brand = {
  name: 'Kola',
  /** Short line under the logo / in the hero. */
  tagline: 'Your autonomous AI Career Agent.',
  /** Longer hero supporting copy. */
  heroSubtitle:
    'Kola ingests your background, skills, and career goals, analyzes market intelligence, and curates bespoke job deals tailored for your exact career trajectory.',
  /** Used in <title> and meta tags. */
  titleSuffix: 'Kola',
  /** Voice: friendly, direct, encouraging. Keep microcopy short. */
  voice: {
    searchPlaceholderWhat: 'Role target, skill or company',
    searchPlaceholderWhere: 'City, region or "Remote"',
    emptyResults: "No curated deals match those criteria yet.",
    emptyResultsHint: 'Try adjusting your agent parameters or selecting broader filters.',
    emptySaved: 'No pinned deals yet.',
    emptySavedHint: 'Bookmark standout career deals to have your AI agent track them.',
    applySuccess: 'Profile submitted to hiring team. Your agent is monitoring status!',
  },
  /** Brand "specialities": the signature elements that make Kola feel like Kola. */
  signature: {
    /** Wordmark paths live in src/brand/logo-paths.ts. The "<>" in K<>la is the brand's code motif. */
    /** Highlighted word in the hero headline gets the brand gradient underline. */
    heroHeadline: { before: 'Your personal AI agent', highlight: 'analyzes your data', after: 'to unlock top career deals.' },
  },
  contact: {
    email: 'hello@kola.example',
  },
  social: [
    { label: 'LinkedIn', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'X', href: '#' },
  ],
} as const;

export function pageTitle(title?: string) {
  return title ? `${title} · ${brand.titleSuffix}` : `${brand.titleSuffix} · Autonomous AI Career Agent`;
}
