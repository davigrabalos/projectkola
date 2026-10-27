import type { Salary } from '../data/types';

const PERIOD_LABEL = { year: '/yr', month: '/mo', hour: '/hr' } as const;

export function formatSalary(s?: Salary) {
  if (!s) return 'Salary not disclosed';
  const fmt = new Intl.NumberFormat('en', { style: 'currency', currency: s.currency, maximumFractionDigits: 0, notation: s.min >= 10000 ? 'compact' : 'standard' });
  const range = s.min === s.max ? fmt.format(s.min) : `${fmt.format(s.min)} – ${fmt.format(s.max)}`;
  return `${range}${PERIOD_LABEL[s.period]}`;
}

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)}+ months ago`;
}

export function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 2 * 86_400_000;
}

export function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/** Rough annual value used only for sorting. */
export function annualised(s?: Salary) {
  if (!s) return 0;
  const mult = s.period === 'year' ? 1 : s.period === 'month' ? 12 : 1800;
  return s.max * mult;
}
