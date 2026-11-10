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
  tagline: 'Real jobs from real company boards, ranked for you.',
  /** Longer hero supporting copy. */
  heroSubtitle: (companies?: number) =>
    `Real openings from the career pages of ${companies ?? 'dozens of'} companies, refreshed every few hours and ranked against your skills, level and pay.`,
  /** Used in <title> and meta tags. */
  titleSuffix: 'Kola',
  /** Voice: friendly, direct, encouraging. Keep microcopy short. */
  voice: {
    searchPlaceholderWhat: 'Role, skill or company',
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
    /** Hero headline: "Your next role, / in Lisbon." The city (accent colour) rolls through `cities`;
        `still` replaces it under reduced motion, `label` is what screen readers hear. */
    heroHeadline: {
      lead: 'Your next role,',
      pre: 'in',
      cities: ['Lisbon.', 'Berlin.', 'São Paulo.', 'London.', 'Amsterdam.', 'Barcelona.', 'Paris.'],
      still: 'Europe & Brazil.',
      label: 'Your next role, in Europe or Brazil.',
    },
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
  return title ? `${title} · ${brand.titleSuffix}` : `${brand.titleSuffix} · Real jobs, ranked for you`;
}
