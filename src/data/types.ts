export type WorkMode = 'remote' | 'hybrid' | 'on-site';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type SalaryPeriod = 'year' | 'month' | 'hour';

export interface Salary {
  min: number;
  max: number;
  currency: string;
  period: SalaryPeriod;
}

export interface Company {
  id: string;
  name: string;
  /** Curated hiring partner (shown on the Companies pages) vs. a company seen only in a job feed. */
  curated?: boolean;
  /** Open roles right now (API only). */
  openJobs?: number;
  industry: string;
  size: string;
  headquarters: string;
  website: string;
  about: string;
  rating?: number;
}

/** Where a real job came from. Mock jobs have no source. */
export type JobProvider = 'greenhouse' | 'lever' | 'adzuna';
export interface JobSource {
  provider: JobProvider;
  /** The original posting (Kola links back to it). */
  url: string;
}

export interface Job {
  id: string;
  title: string;
  companyId: string;
  /** Embedded by the API so cards never need a second lookup. Mock jobs resolve it from data/companies. */
  company?: { id: string; name: string };
  /** Real jobs are applied for on the employer's (or Adzuna's) site. */
  applyUrl?: string;
  source?: JobSource;
  /** Sanitised HTML from the source. Real jobs use this instead of the three lists below (sent empty). */
  descriptionHtml?: string;
  category: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experience: ExperienceLevel;
  salary?: Salary;
  postedAt: string; // ISO date
  easyApply: boolean;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  'on-site': 'On-site',
};
export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};
export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  lead: 'Lead / Manager',
};
