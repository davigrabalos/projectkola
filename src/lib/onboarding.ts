/* =====================================================================
   ONBOARDING QUEST: data model, scoring, validation, draft storage.
   ---------------------------------------------------------------------
   Profile creation is a short quest. Each step fills part of a Draft;
   XP is *computed* from the draft (never accumulated from clicks), so it
   is honest, idempotent and survives reloads. 100 XP = complete profile.
   ===================================================================== */
import { CAREER_PERSONAS, DEMO_PROFILES, type AuthUser, type CareerRole, type CareerType, type DataSourceType } from '../context/Auth';
import type { IconName } from '../components/Icon';
import { normalizeHex } from './accent';

export type Seniority = 'entry' | 'mid' | 'senior' | 'staff';
export type WorkStyle = 'remote' | 'hybrid' | 'onsite' | 'any';
export type Currency = 'USD' | 'EUR' | 'GBP';

export interface VaultFile { name: string; size: number; foundSkills: string[] }

export interface Draft {
  v: 1;
  name: string;
  email: string;
  careerType: CareerType | null;
  title: string;
  seniority: Seniority | null;
  roles: CareerRole[];
  skills: string[];
  workMode: WorkStyle | null;
  compMin: number;
  compMax: number;
  currency: Currency;
  compSet: boolean;
  priorities: string[];
  relocate: boolean;
  cv: VaultFile | null;
  linkedin: string;
  github: string;
  portfolio: string;
  accentColor: string | null;
  agreed: boolean;
  /** Furthest step unlocked (index). */
  maxReached: number;
  /** Step to resume on. */
  current: number;
}

/* ---------- Steps ---------- */

export interface StepDef { id: string; label: string; title: string; quest: string; icon: IconName; optional?: boolean }

export const STEPS = [
  { id: 'identity', label: 'Identity', title: 'Create your agent', icon: 'user',
    quest: 'Every agent needs a name. This is how hiring partners will reach you.' },
  { id: 'track', label: 'Track', title: 'Choose your track', icon: 'flag',
    quest: 'Pick the career class your agent specialises in. You can switch it any time.' },
  { id: 'background', label: 'Background', title: 'Your work background', icon: 'briefcase',
    quest: 'Tell your agent where you have been. Roles and skills power every match.' },
  { id: 'preferences', label: 'Deal terms', title: 'Set your deal terms', icon: 'target',
    quest: 'What does a great next move look like? Your agent negotiates inside these terms.' },
  { id: 'vault', label: 'Vault', title: 'Archive your career', icon: 'archive', optional: true,
    quest: 'Drop your CV and link your profiles. Verified sources unlock better deals.' },
  { id: 'style', label: 'Style', title: 'Make it yours', icon: 'palette', optional: true,
    quest: 'Pick a signature colour. It becomes your accent across all of Kola.' },
  { id: 'launch', label: 'Launch', title: 'Review and launch', icon: 'rocket',
    quest: 'Check your agent card, claim any XP left, then launch.' },
] as const satisfies readonly StepDef[];

export type StepId = (typeof STEPS)[number]['id'];
export const stepIndex = (id: string | null) => STEPS.findIndex((s) => s.id === id);

/* ---------- Options ---------- */

export const SENIORITY: { id: Seniority; label: string; years: string; hint: string }[] = [
  { id: 'entry', label: 'Entry', years: '0–2 years', hint: 'Learning fast' },
  { id: 'mid', label: 'Mid', years: '3–5 years', hint: 'Shipping on your own' },
  { id: 'senior', label: 'Senior', years: '6–9 years', hint: 'Leading the work' },
  { id: 'staff', label: 'Staff+', years: '10+ years', hint: 'Setting direction' },
];

export const WORK_STYLES: { id: WorkStyle; label: string; hint: string; icon: IconName }[] = [
  { id: 'remote', label: 'Remote', hint: 'Work from anywhere', icon: 'globe' },
  { id: 'hybrid', label: 'Hybrid', hint: 'A few days in the office', icon: 'users' },
  { id: 'onsite', label: 'On-site', hint: 'Every day with the team', icon: 'building' },
  { id: 'any', label: 'Open', hint: 'The right deal decides', icon: 'sparkles' },
];

export const POWER_UPS = [
  'High equity upside', 'Async culture', 'Cutting-edge stack', 'Direct founder access',
  'Work-life balance', 'Mentorship', 'Staff-level autonomy', 'Learning budget', 'Visa sponsorship',
];
export const MAX_POWER_UPS = 3;
export const MAX_SKILLS = 12;

export const CURRENCIES: { id: Currency; symbol: string }[] = [
  { id: 'USD', symbol: '$' }, { id: 'EUR', symbol: '€' }, { id: 'GBP', symbol: '£' },
];
export const COMP_RANGE = { min: 30_000, max: 500_000, step: 5_000, gap: 10_000 };

/** Sensible default pay range per level, so the sliders start somewhere realistic. */
export const COMP_DEFAULTS: Record<Seniority, [number, number]> = {
  entry: [60_000, 90_000], mid: [90_000, 140_000], senior: [140_000, 200_000], staff: [190_000, 280_000],
};

const GENERAL_SKILLS = ['Communication', 'Leadership', 'SQL', 'Python', 'TypeScript', 'Figma', 'Product strategy', 'Data analysis', 'Mentoring', 'Agile'];

export function skillSuggestions(d: Draft): string[] {
  const persona = d.careerType ? CAREER_PERSONAS[d.careerType].defaultSkills : [];
  const have = new Set(d.skills.map((s) => s.toLowerCase()));
  return [...new Set([...persona, ...GENERAL_SKILLS])].filter((s) => !have.has(s.toLowerCase())).slice(0, 8);
}

/** Demo stand-in for CV parsing: a deterministic pick of skills based on the file name. */
export function skillsFromFile(fileName: string, d: Draft): string[] {
  const pool = skillSuggestions(d);
  let h = 0;
  for (const c of fileName) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const count = Math.min(pool.length, 3 + (h % 3));
  return pool.slice(0, count);
}

/* ---------- Formatting + parsing ---------- */

export const symbolFor = (c: Currency) => CURRENCIES.find((x) => x.id === c)?.symbol ?? '$';
export const formatK = (n: number, c: Currency) => `${symbolFor(c)}${Math.round(n / 1000)}k`;
export const formatComp = (d: Pick<Draft, 'compMin' | 'compMax' | 'currency'>) => `${formatK(d.compMin, d.currency)} – ${formatK(d.compMax, d.currency)}`;
export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export function normalizeLinkedIn(s: string): string | null {
  const m = s.trim().match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9_%-]{3,100})\/?(?:[?#].*)?$/i);
  return m ? `https://www.linkedin.com/in/${m[1]}` : null;
}

export function normalizeGithub(s: string): string | null {
  const t = s.trim();
  const m = t.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/?$/i) ?? t.match(/^@?([A-Za-z0-9][A-Za-z0-9-]{0,38})$/);
  return m ? `https://github.com/${m[1]}` : null;
}

export function normalizeUrl(s: string): string | null {
  const t = s.trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return /\.[a-z]{2,}$/i.test(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

export function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!p) return { score: 0, label: '' };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const s = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
  return { score: s, label: ['', 'Weak', 'Okay', 'Strong', 'Excellent'][s] };
}

/* ---------- XP, levels, achievements ---------- */

export interface XpItem { id: string; label: string; points: number; step: StepId; done: boolean }

export function xpItems(d: Draft): XpItem[] {
  return [
    { id: 'name', label: 'Add your name', points: 5, step: 'identity', done: d.name.trim().length >= 2 },
    { id: 'email', label: 'Add your email', points: 5, step: 'identity', done: isEmail(d.email) },
    { id: 'track', label: 'Choose a track', points: 10, step: 'track', done: !!d.careerType },
    { id: 'title', label: 'Write your headline', points: 5, step: 'background', done: d.title.trim().length >= 2 },
    { id: 'seniority', label: 'Set your experience level', points: 5, step: 'background', done: !!d.seniority },
    { id: 'role', label: 'Add a role', points: 10, step: 'background', done: d.roles.length > 0 },
    { id: 'skills3', label: 'Add 3 skills', points: 5, step: 'background', done: d.skills.length >= 3 },
    { id: 'skills6', label: 'Add 6 skills', points: 5, step: 'background', done: d.skills.length >= 6 },
    { id: 'workMode', label: 'Pick a work style', points: 5, step: 'preferences', done: !!d.workMode },
    { id: 'comp', label: 'Set your pay range', points: 5, step: 'preferences', done: d.compSet },
    { id: 'powerUp', label: 'Choose a power-up', points: 5, step: 'preferences', done: d.priorities.length > 0 },
    { id: 'cv', label: 'Archive your CV', points: 15, step: 'vault', done: !!d.cv },
    { id: 'linkedin', label: 'Link LinkedIn', points: 10, step: 'vault', done: !!normalizeLinkedIn(d.linkedin) },
    { id: 'extra', label: 'Link GitHub or a portfolio', points: 5, step: 'vault', done: !!normalizeGithub(d.github) || !!normalizeUrl(d.portfolio) },
    { id: 'accent', label: 'Pick a signature colour', points: 5, step: 'style', done: !!d.accentColor },
  ];
}

export const xpOf = (items: XpItem[]) => items.reduce((sum, i) => sum + (i.done ? i.points : 0), 0);
export const xpForStep = (items: XpItem[], step: StepId) => items.filter((i) => i.step === step).reduce((s, i) => s + i.points, 0);

export const LEVELS = [
  { min: 0, name: 'Rookie' }, { min: 25, name: 'Scout' }, { min: 50, name: 'Pro' }, { min: 75, name: 'Elite' }, { min: 95, name: 'Legend' },
];
export function levelFor(xp: number) {
  let index = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.min) index = i; });
  return { index, ...LEVELS[index], next: LEVELS[index + 1] as (typeof LEVELS)[number] | undefined };
}

export interface Achievement { id: string; label: string; hint: string; icon: IconName; test: (d: Draft) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', label: 'First steps', hint: 'Fill in your identity', icon: 'user', test: (d) => d.name.trim().length >= 2 && isEmail(d.email) },
  { id: 'pathfinder', label: 'Pathfinder', hint: 'Choose a career track', icon: 'flag', test: (d) => !!d.careerType },
  { id: 'storyteller', label: 'Storyteller', hint: 'Add two roles', icon: 'briefcase', test: (d) => d.roles.length >= 2 },
  { id: 'skill-stack', label: 'Skill stack', hint: 'Add six skills', icon: 'bolt', test: (d) => d.skills.length >= 6 },
  { id: 'archivist', label: 'Archivist', hint: 'Archive your CV', icon: 'fileText', test: (d) => !!d.cv },
  { id: 'connected', label: 'Connected', hint: 'Link your LinkedIn', icon: 'linkedin', test: (d) => !!normalizeLinkedIn(d.linkedin) },
  { id: 'full-vault', label: 'Full vault', hint: 'Fill all four vault slots', icon: 'archive',
    test: (d) => !!d.cv && !!normalizeLinkedIn(d.linkedin) && !!normalizeGithub(d.github) && !!normalizeUrl(d.portfolio) },
  { id: 'signature', label: 'Signature colour', hint: 'Pick your colour', icon: 'palette', test: (d) => !!d.accentColor },
];

export const vaultCount = (d: Draft) =>
  [!!d.cv, !!normalizeLinkedIn(d.linkedin), !!normalizeGithub(d.github), !!normalizeUrl(d.portfolio)].filter(Boolean).length;

/* ---------- Validation ---------- */

export type Errors = Partial<Record<string, string>>;

export function validateStep(id: StepId, d: Draft, opts: { password?: string; checkPassword?: boolean } = {}): Errors {
  const e: Errors = {};
  switch (id) {
    case 'identity':
      if (d.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!isEmail(d.email)) e.email = 'Enter a valid email address, like name@example.com.';
      if (opts.checkPassword && (opts.password ?? '').length < 8) e.password = 'Use at least 8 characters.';
      break;
    case 'track':
      if (!d.careerType) e.careerType = 'Choose the track that fits you best.';
      break;
    case 'background':
      if (d.title.trim().length < 2) e.title = 'Add a short headline, like “Senior Product Designer”.';
      if (!d.seniority) e.seniority = 'Choose your experience level.';
      break;
    case 'preferences':
      if (!d.workMode) e.workMode = 'Choose how you want to work.';
      break;
    case 'vault':
      if (d.linkedin.trim() && !normalizeLinkedIn(d.linkedin)) e.linkedin = 'Use your profile link, like linkedin.com/in/your-name.';
      if (d.github.trim() && !normalizeGithub(d.github)) e.github = 'Use a GitHub username or link, like github.com/your-name.';
      if (d.portfolio.trim() && !normalizeUrl(d.portfolio)) e.portfolio = 'Use a full web address, like yoursite.com.';
      break;
    case 'launch':
      if (!d.agreed) e.agreed = 'Please accept the terms to launch your agent.';
      break;
    case 'style':
      break;
  }
  return e;
}

export const hasErrors = (e: Errors) => Object.keys(e).length > 0;

/* ---------- Draft lifecycle ---------- */

export function emptyDraft(): Draft {
  return {
    v: 1, name: '', email: '', careerType: null, title: '', seniority: null, roles: [], skills: [],
    workMode: null, compMin: 90_000, compMax: 140_000, currency: 'USD', compSet: false, priorities: [], relocate: false,
    cv: null, linkedin: '', github: '', portfolio: '', accentColor: null, agreed: false, maxReached: 0, current: 0,
  };
}

/** Editing an existing (non-demo) profile starts from what it already has. */
export function draftFromUser(u: AuthUser): Draft {
  const d = emptyDraft();
  return {
    ...d,
    name: u.name, email: u.email, careerType: u.careerType, title: u.title,
    seniority: (u.seniority as Seniority | undefined) ?? null, roles: u.roles ?? [], skills: u.skills,
    workMode: u.workPreference ?? null, priorities: u.dealPriorities.filter((p) => POWER_UPS.includes(p)).slice(0, MAX_POWER_UPS),
    relocate: !!u.relocate, compSet: true,
    cv: u.resumeName ? { name: u.resumeName, size: 0, foundSkills: [] } : null,
    linkedin: u.linkedinUrl ?? '', github: u.githubUrl ?? '', portfolio: u.portfolioUrl ?? '',
    accentColor: normalizeHex(u.accentColor), maxReached: STEPS.length - 1, current: 0,
  };
}

const DRAFT_KEY = 'kola:onboarding-draft';

/** Passwords and file contents are never stored: only the draft fields above. */
export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (parsed.v !== 1) return null;
    return { ...emptyDraft(), ...parsed };
  } catch {
    return null;
  }
}
export function saveDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}

/** Final profile handed to the auth layer. */
export function draftToProfile(d: Draft, strength: number) {
  const careerType = d.careerType ?? 'engineering';
  const sources: DataSourceType[] = [];
  if (d.cv) sources.push('resume');
  if (normalizeLinkedIn(d.linkedin)) sources.push('linkedin');
  if (normalizeGithub(d.github)) sources.push('github');
  if (normalizeUrl(d.portfolio)) sources.push('portfolio');
  return {
    name: d.name.trim(),
    email: d.email.trim(),
    careerType,
    title: d.title.trim() || DEMO_PROFILES[careerType].title,
    seniority: d.seniority ?? undefined,
    roles: d.roles,
    skills: d.skills,
    targetComp: formatComp(d),
    workPreference: d.workMode ?? 'any',
    relocate: d.relocate,
    dealPriorities: d.priorities,
    connectedSources: sources,
    resumeName: d.cv?.name,
    linkedinUrl: normalizeLinkedIn(d.linkedin) ?? undefined,
    githubUrl: normalizeGithub(d.github) ?? undefined,
    portfolioUrl: normalizeUrl(d.portfolio) ?? undefined,
    accentColor: d.accentColor ?? undefined,
    profileStrength: strength,
  };
}
