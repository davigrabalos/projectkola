import type { AuthUser, CareerType } from '../context/Auth';
import type { ExperienceLevel, Job } from '../data/types';
import { annualised } from './format';
import { canonicalSkill } from './skills';

/* How well a job fits the signed-in profile, 0-100, with the reasons in plain words.
   Weights: skills 45, level 20, work style 15, pay 10, track 10. Unknowns score neutral, never zero. */

/** Which job category each career track looks at first (null = any). */
export const TRACK_CATEGORY: Record<CareerType, string | null> = {
  engineering: 'Engineering',
  design: 'Design',
  'data-ai': 'Data',
  'product-growth': 'Product',
  executive: null,
  'career-switcher': null,
};

export interface MatchProfile {
  skills: string[];
  level: number | null; // 0 entry .. 3 lead
  workPreference: AuthUser['workPreference'];
  pay: { min: number; currency: string } | null;
  category: string | null;
}

export interface Match {
  score: number;
  matchedSkills: string[];
  reasons: string[];
}

const LEVEL: Record<ExperienceLevel, number> = { entry: 0, mid: 1, senior: 2, lead: 3 };
const SENIORITY: Record<string, number> = { entry: 0, mid: 1, senior: 2, staff: 3 };
const SYMBOLS: [string, string][] = [['R$', 'BRL'], ['€', 'EUR'], ['£', 'GBP'], ['$', 'USD']];

/** "€90k – €140k" -> { min: 90000, currency: 'EUR' }. */
export function parseTargetComp(s: string | undefined): MatchProfile['pay'] {
  if (!s) return null;
  const currency = SYMBOLS.find(([sym]) => s.includes(sym))?.[1];
  const m = s.replace(/[,\s]/g, '').match(/(\d+(?:\.\d+)?)(k)?/i);
  if (!currency || !m) return null;
  return { min: Number(m[1]) * (m[2] ? 1000 : 1), currency };
}

function levelFromTitle(title: string): number | null {
  if (/\b(head|director|vp|chief|lead|principal)\b/i.test(title)) return 3;
  if (/\b(senior|sr|staff)\b/i.test(title)) return 2;
  if (/\b(junior|jr|intern|graduate)\b/i.test(title)) return 0;
  return title ? 1 : null;
}

export function profileOf(user: AuthUser): MatchProfile {
  return {
    skills: user.skills.map(canonicalSkill),
    level: user.seniority && user.seniority in SENIORITY ? SENIORITY[user.seniority] : levelFromTitle(user.title),
    workPreference: user.workPreference,
    pay: parseTargetComp(user.targetComp),
    category: TRACK_CATEGORY[user.careerType],
  };
}

const WORK_FIT: Record<AuthUser['workPreference'], Record<Job['workMode'], number>> = {
  remote: { remote: 1, hybrid: 0.5, 'on-site': 0.15 },
  hybrid: { remote: 0.8, hybrid: 1, 'on-site': 0.5 },
  onsite: { remote: 0.6, hybrid: 0.8, 'on-site': 1 },
  any: { remote: 1, hybrid: 1, 'on-site': 1 },
};

export function matchJob(job: Job, p: MatchProfile): Match {
  const reasons: string[] = [];
  const mine = new Set(p.skills.map((s) => s.toLowerCase()));
  const matchedSkills = job.skills.filter((s) => mine.has(s.toLowerCase()));
  const skills = job.skills.length ? Math.min(1, matchedSkills.length / Math.min(3, job.skills.length)) : 0.5;
  if (matchedSkills.length) reasons.push(`Uses ${matchedSkills.length === 1 ? 'your skill' : 'your skills'} ${matchedSkills.slice(0, 3).join(', ')}`);

  const gap = p.level === null ? null : Math.abs(LEVEL[job.experience] - p.level);
  const level = gap === null ? 0.6 : gap === 0 ? 1 : gap === 1 ? 0.6 : 0.2;
  if (gap === 0) reasons.push('Right level for you');

  const work = WORK_FIT[p.workPreference][job.workMode];
  if (work === 1 && p.workPreference !== 'any') reasons.push(`${job.workMode === 'on-site' ? 'On-site' : job.workMode === 'remote' ? 'Remote' : 'Hybrid'}, as you prefer`);

  let pay = 0.5;
  if (p.pay && job.salary && job.salary.currency === p.pay.currency) {
    const yearly = annualised(job.salary);
    pay = yearly >= p.pay.min ? 1 : yearly >= p.pay.min * 0.85 ? 0.6 : 0.15;
    if (pay === 1) reasons.push('Pays within your target');
  }

  const track = p.category === null ? 0.7 : job.category === p.category ? 1 : 0.3;

  const score = Math.round(45 * skills + 20 * level + 15 * work + 10 * pay + 10 * track);
  return { score: Math.max(0, Math.min(100, score)), matchedSkills, reasons };
}

/** The best `n` jobs for a profile, highest score first (ties: newest first). */
export function topMatches(jobs: Job[], p: MatchProfile, n: number) {
  return jobs
    .map((job) => ({ job, match: matchJob(job, p) }))
    .sort((a, b) => b.match.score - a.match.score || b.job.postedAt.localeCompare(a.job.postedAt))
    .slice(0, n);
}
