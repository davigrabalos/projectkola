/* =====================================================================
   PERSONAL ACCENT
   ---------------------------------------------------------------------
   The neutrals (graphite + off-white) and the status colours (success,
   warning, danger, info) are fixed. The accent comes from the user's
   favourite colour.

   One seed colour becomes a full, readable accent for BOTH themes:
   - the hue and saturation are kept (only sRGB's own limit at the fitted
     lightness reduces chroma), so picks stay vivid on graphite and paper,
   - lightness is set per theme and nudged until text contrast passes
     WCAG AA (4.5:1) on every surface and for text placed on the accent,
   - a second "companion" accent is used for small details (eyebrow slashes,
     badges, the saved bookmark). It is the same colour, except for the two
     Kola presets, which keep the brand's cyan + orange pairing. Deriving a
     different hue would drift into the status colours (pink -> danger red,
     moss -> success green), so it is never invented.
   The result is written as CSS variables (--accent-*), which tokens.css maps
   onto the semantic --color-brand / --color-accent roles.
   ===================================================================== */

export interface AccentPreset { id: string; label: string; hex: string; companion?: string }

/** Kola cyan: used when nobody is signed in or no colour was chosen. */
export const DEFAULT_ACCENT = '#2CAED4';

/* Presets sit at ~92% of the most saturated colour sRGB can show for their hue. */
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'cyan', label: 'Kola cyan', hex: DEFAULT_ACCENT, companion: '#EC7B26' },
  { id: 'blue', label: 'Blue', hex: '#3E8AF6' },
  { id: 'indigo', label: 'Indigo', hex: '#696AF5' },
  { id: 'violet', label: 'Violet', hex: '#A457EF' },
  { id: 'pink', label: 'Pink', hex: '#EE46A2' },
  { id: 'orange', label: 'Kola orange', hex: '#EC7B26', companion: DEFAULT_ACCENT },
  { id: 'gold', label: 'Gold', hex: '#DBA92C' },
  { id: 'moss', label: 'Moss', hex: '#85B829' },
  { id: 'teal', label: 'Teal', hex: '#2FBBB4' },
  { id: 'graphite', label: 'Graphite', hex: '#8B8D91' },
];

export const ACCENT_STORAGE_KEY = 'kola:accent';

/* ---------- Colour math (sRGB <-> OKLCH, WCAG contrast) ---------- */

type Rgb = [number, number, number]; // linear sRGB, 0..1

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Accepts #rgb or #rrggbb. Returns null for anything else. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.split('').map((c) => c + c).join('')}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s}`.toUpperCase();
  return null;
}

function hexToLinear(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

function linearToOklch([r, g, b]: Rgb): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const H = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), H < 0 ? H + 360 : H];
}

function oklchToLinear(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** Largest chroma at this lightness and hue that still fits in sRGB. */
function maxChroma(L: number, H: number): number {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return lo;
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}
const toChannels = (rgb: Rgb) => rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255)).join(' ');

/* ---------- Theme fitting ---------- */

const CHROMA_CAP = 0.26; // only trims neon extremes; sRGB gamut is the real limit
const MONO_CHROMA = 0.03; // below this the pick is treated as a neutral (Graphite)
const MONO_TINT = { C: 0.006, H: 85 }; // neutrals lean warm, like the off-white

/** Surfaces and text colours each theme must stay readable on. Mirrors tokens.css. */
const THEMES = {
  dark: {
    surfaces: ['#151617', '#1B1C1E', '#222325'].map(hexToLinear), // bg, surface, raised
    onAccent: hexToLinear('#0E0F10'), // text placed on the accent (buttons)
    dir: 1, // lighten until it passes
    base: 0.7, hover: 0.05, strong: 0.84,
    monoBase: 0.9, monoStrong: 0.96, monoCompanion: 0.72,
  },
  light: {
    surfaces: ['#F5F3EF', '#FCFBF9', '#EDEBE6'].map(hexToLinear), // bg, surface, sunken
    onAccent: hexToLinear('#FFFFFF'),
    dir: -1, // darken until it passes
    base: 0.52, hover: -0.05, strong: 0.42,
    monoBase: 0.3, monoStrong: 0.22, monoCompanion: 0.46,
  },
} as const;

type ThemeSpec = (typeof THEMES)[keyof typeof THEMES];

/** Steps lightness from `start` in the theme's direction until the colour passes AA everywhere. */
function fit(spec: ThemeSpec, start: number, C: number, H: number): Rgb {
  for (let L = start; L > 0.05 && L < 0.99; L += spec.dir * 0.01) {
    const rgb = oklchToLinear(L, Math.min(C, maxChroma(L, H)), H);
    const readable = spec.surfaces.every((s) => contrast(rgb, s) >= 4.5) && contrast(rgb, spec.onAccent) >= 4.5;
    if (readable) return rgb;
  }
  return oklchToLinear(start, 0, H);
}

function at(L: number, C: number, H: number): Rgb {
  return oklchToLinear(L, Math.min(C, maxChroma(L, H)), H);
}

export type AccentVars = Record<`--${string}`, string>;

interface Hue { C: number; H: number; mono: boolean }

function hueOf(hex: string): Hue {
  const [, rawC, H] = linearToOklch(hexToLinear(hex));
  return rawC < MONO_CHROMA ? { ...MONO_TINT, mono: true } : { C: Math.min(rawC, CHROMA_CAP), H, mono: false };
}

/** base / hover / strong for one colour in one theme. */
function shades(spec: ThemeSpec, { C, H, mono }: Hue) {
  if (mono) {
    // Graphite: off-white on dark, near-black on light.
    return { base: at(spec.monoBase, C, H), hover: at(spec.monoBase + spec.hover, C, H), strong: at(spec.monoStrong, C, H) };
  }
  const base = fit(spec, spec.base, C, H);
  const [baseL] = linearToOklch(base);
  // "strong" is for text on tinted backgrounds, so it sits further from the surface than base.
  const strongL = spec.dir > 0 ? Math.max(spec.strong, baseL + 0.08) : Math.min(spec.strong, baseL - 0.08);
  return { base, hover: at(baseL + spec.hover, C, H), strong: at(strongL, C, H) };
}

function themeVars(prefix: 'd' | 'l', spec: ThemeSpec, accent: Hue, companion: Hue): AccentVars {
  const a = shades(spec, accent);
  const b = companion.mono && accent.mono
    ? { ...a, base: at(spec.monoCompanion, companion.C, companion.H) } // Graphite: a quieter grey for details
    : shades(spec, companion);
  return {
    [`--accent-${prefix}`]: toHex(a.base),
    [`--accent-${prefix}-hover`]: toHex(a.hover),
    [`--accent-${prefix}-strong`]: toHex(a.strong),
    [`--accent-${prefix}-rgb`]: toChannels(a.base),
    [`--accent2-${prefix}`]: toHex(b.base),
    [`--accent2-${prefix}-hover`]: toHex(b.hover),
    [`--accent2-${prefix}-strong`]: toHex(b.strong),
    [`--accent2-${prefix}-rgb`]: toChannels(b.base),
  };
}

const cache = new Map<string, AccentVars>();

/** All accent CSS variables (dark + light) for one seed colour. */
export function accentVars(seed: string): AccentVars {
  const hex = normalizeHex(seed) ?? DEFAULT_ACCENT;
  const hit = cache.get(hex);
  if (hit) return hit;
  const accent = hueOf(hex);
  const companion = hueOf(presetFor(hex)?.companion ?? hex);
  const vars = { ...themeVars('d', THEMES.dark, accent, companion), ...themeVars('l', THEMES.light, accent, companion) };
  cache.set(hex, vars);
  return vars;
}

/**
 * Paints the accent by setting the variables on <html>.
 * `persist` stores them so index.html can apply them before first paint (no colour flash).
 * Previews (live picking) pass persist: false.
 */
export function applyAccent(seed: string, { persist }: { persist: boolean }) {
  const vars = accentVars(seed);
  const style = document.documentElement.style;
  for (const [k, v] of Object.entries(vars)) style.setProperty(k, v);
  if (!persist) return;
  try { localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(vars)); } catch { /* storage unavailable */ }
}

/** Preset matching a seed, if any. */
export const presetFor = (seed: string | null | undefined) => {
  const hex = normalizeHex(seed);
  return ACCENT_PRESETS.find((p) => p.hex === hex);
};
