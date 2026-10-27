import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { IconName } from '../components/Icon';
import { applyAccent, DEFAULT_ACCENT, normalizeHex } from '../lib/accent';

export type CareerType =
  | 'engineering'
  | 'design'
  | 'data-ai'
  | 'product-growth'
  | 'executive'
  | 'career-switcher';

export type DataSourceType = 'linkedin' | 'github' | 'resume' | 'portfolio';

export interface CareerPersona {
  id: CareerType;
  label: string;
  badge: string;
  icon: IconName;
  headline: string;
  tagline: string;
  dealRange: string;
  dataStreams: { id: DataSourceType; label: string; icon: IconName; description: string }[];
  defaultSkills: string[];
  sampleDeals: {
    title: string;
    company: string;
    comp: string;
    match: number;
    highlight: string;
  }[];
}

export const CAREER_PERSONAS: Record<CareerType, CareerPersona> = {
  engineering: {
    id: 'engineering',
    label: 'Software & Systems',
    badge: 'Engineering',
    icon: 'code',
    headline: 'High-Impact IC & Architecture Deals',
    tagline: 'Staff, Principal & Senior Full-Stack / Backend / DevOps',
    dealRange: '$165k – $240k + Significant Equity',
    dataStreams: [
      { id: 'github', label: 'GitHub / GitLab', icon: 'github', description: 'Parses repos, commit frequency, languages, system scale' },
      { id: 'linkedin', label: 'LinkedIn History', icon: 'linkedin', description: 'Syncs verified tenure, promotions, team scale' },
      { id: 'resume', label: 'Tech CV / Architecture Doc', icon: 'fileText', description: 'Extracts frameworks, distributed systems, perf wins' },
    ],
    defaultSkills: ['TypeScript', 'React', 'Go', 'Distributed Systems', 'Kubernetes', 'PostgreSQL'],
    sampleDeals: [
      { title: 'Staff Systems Architect', company: 'Linear', comp: '$195k – $230k + 0.35% equity', match: 98, highlight: 'High async & minimal meetings' },
      { title: 'Lead Platform Engineer', company: 'Retool', comp: '$180k – $220k', match: 95, highlight: 'Core infrastructure ownership' },
    ],
  },
  design: {
    id: 'design',
    label: 'Design & Creative',
    badge: 'Design',
    icon: 'pen',
    headline: 'Design-Led & Product Vision Deals',
    tagline: 'Principal UI/UX, Design Systems, Art Direction & Motion',
    dealRange: '$150k – $210k + Equity',
    dataStreams: [
      { id: 'portfolio', label: 'Figma / Portfolio URL', icon: 'external', description: 'Gathers live prototypes, craft fidelity, case studies' },
      { id: 'linkedin', label: 'LinkedIn Endorsements', icon: 'linkedin', description: 'Gathers brand collabs, design leadership roles' },
      { id: 'resume', label: 'Design Experience PDF', icon: 'fileText', description: 'Extracts metrics on conversion, redesigns, user testing' },
    ],
    defaultSkills: ['Figma', 'Design Systems', 'UX Research', 'Interaction Design', 'Motion Design', 'Prototyping'],
    sampleDeals: [
      { title: 'Lead Product Designer', company: 'Stripe', comp: '$175k – $205k', match: 97, highlight: 'Design systems & financial UI' },
      { title: 'Principal Brand & UX Director', company: 'Vercel', comp: '$185k – $215k + Equity', match: 94, highlight: 'Developer experience & aesthetic craft' },
    ],
  },
  'data-ai': {
    id: 'data-ai',
    label: 'Data, ML & AI Systems',
    badge: 'AI & Data',
    icon: 'chart',
    headline: 'AI Labs & Deep Tech Intelligence Deals',
    tagline: 'LLM Fine-Tuning, Data Science, MLOps & Big Data Pipelines',
    dealRange: '$190k – $320k + Top-Tier Equity',
    dataStreams: [
      { id: 'github', label: 'Code & Research Notebooks', icon: 'github', description: 'Evaluates PyTorch models, datasets, eval scripts' },
      { id: 'linkedin', label: 'Research & Industry Tenure', icon: 'linkedin', description: 'Academic citations, industry labs, patent history' },
      { id: 'resume', label: 'CV & Publications', icon: 'fileText', description: 'Extracts model training parameters, infra scale, CUDA' },
    ],
    defaultSkills: ['PyTorch', 'Python', 'LLM Fine-Tuning', 'MLOps', 'Vector DBs', 'Distributed Training'],
    sampleDeals: [
      { title: 'Founding ML / AI Engineer', company: 'Mistral AI', comp: '$210k – $280k + 0.5% equity', match: 99, highlight: 'Open-weights frontier model lab' },
      { title: 'Staff Data Infrastructure Engineer', company: 'Databricks', comp: '$195k – $240k', match: 96, highlight: 'Petabyte-scale lakehouse engines' },
    ],
  },
  'product-growth': {
    id: 'product-growth',
    label: 'Product & Growth',
    badge: 'Product',
    icon: 'megaphone',
    headline: '0-to-1 & Scale Stage Product Deals',
    tagline: 'Principal PM, Group PM, Head of Growth & Monetization',
    dealRange: '$170k – $250k + Growth Pool',
    dataStreams: [
      { id: 'linkedin', label: 'Career Trajectory & Tenures', icon: 'linkedin', description: 'Tracks company growth stages (Seed to Series D)' },
      { id: 'resume', label: 'Product Impact Metrics', icon: 'fileText', description: 'Quantifies ARR moved, CAC reduced, DAU velocity' },
      { id: 'portfolio', label: 'Product Teardowns / Substack', icon: 'external', description: 'Gathers strategic thinking and growth frameworks' },
    ],
    defaultSkills: ['Product Strategy', 'PLG Growth Loops', 'Data Analytics', 'Roadmapping', 'User Cohort Analysis'],
    sampleDeals: [
      { title: 'Group Product Manager (Core AI)', company: 'Notion', comp: '$190k – $235k', match: 95, highlight: 'Direct CEO alignment on agentic tools' },
      { title: 'Head of Growth', company: 'Ramp', comp: '$200k – $260k + Heavy Equity', match: 93, highlight: 'High-velocity fintech monetization' },
    ],
  },
  executive: {
    id: 'executive',
    label: 'Executive & Staff+',
    badge: 'Leadership',
    icon: 'building',
    headline: 'Confidential Executive & VP Retained Deals',
    tagline: 'VP Engineering, CTO, CPO, General Manager & Founder-in-Residence',
    dealRange: '$240k – $450k + Founder Equity / Advisory',
    dataStreams: [
      { id: 'linkedin', label: 'Executive Network & History', icon: 'linkedin', description: 'Analyzes organizational headcounts, board advisory' },
      { id: 'resume', label: 'Leadership Dossier', icon: 'fileText', description: 'Evaluates P&L sizes ($10M – $200M+), M&A, hiring velocity' },
    ],
    defaultSkills: ['Executive Leadership', 'P&L Management', 'Org Scaling (50-500+)', 'Capital Allocation', 'Board Relations'],
    sampleDeals: [
      { title: 'VP of Engineering', company: 'Supabase', comp: '$260k – $340k + 1.0% equity', match: 96, highlight: 'Global remote team leadership' },
      { title: 'CTO / Co-Founder Track', company: 'NextGen AI Stealth', comp: '$220k – $300k + 8.0% equity', match: 92, highlight: 'Backed by tier-1 venture fund' },
    ],
  },
  'career-switcher': {
    id: 'career-switcher',
    label: 'Career Transition & Switcher',
    badge: 'Explorer',
    icon: 'bolt',
    headline: 'High-Mentorship & Fast-Track Deals',
    tagline: 'Pivoting from Finance, Academia, Operations or Self-Taught into Tech',
    dealRange: '$90k – $135k + Mentorship Package',
    dataStreams: [
      { id: 'github', label: 'Recent Projects & Capstones', icon: 'github', description: 'Measures commitment, learning rate, coding fundamentals' },
      { id: 'resume', label: 'Cross-Disciplinary Experience', icon: 'fileText', description: 'Extracts transferable domain expertise & soft skills' },
      { id: 'linkedin', label: 'Prior Professional Foundation', icon: 'linkedin', description: 'Showcases previous analytical and professional wins' },
    ],
    defaultSkills: ['JavaScript / React', 'Python', 'Analytical Thinking', 'Problem Solving', 'Fast Learning Velocity'],
    sampleDeals: [
      { title: 'Associate Software Engineer (Apprenticeship)', company: 'Figma', comp: '$110k – $130k', match: 94, highlight: 'Dedicated 1-on-1 staff mentorship' },
      { title: 'Junior Fullstack Engineer', company: 'Zapier', comp: '$95k – $120k', match: 91, highlight: '100% remote, structured learning budget' },
    ],
  },
};

/** A past or current job, entered during onboarding. */
export interface CareerRole { id: string; title: string; company: string; start: string; end: string; current: boolean }

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  careerType: CareerType;
  title: string;
  avatarInitials: string;
  connectedSources: DataSourceType[];
  resumeName?: string;
  skills: string[];
  targetComp: string;
  workPreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  dealPriorities: string[];
  dealsMatched: number;
  matchScore: number;
  agentStatus: 'active' | 'analyzing' | 'paused';
  lastAnalyzedAt: string;
  /** Favourite colour picked when creating the profile. Drives the whole UI accent. Missing = Kola cyan. */
  accentColor?: string;
  /* Collected by the onboarding quest (all optional, demo profiles leave them out). */
  seniority?: string;
  roles?: CareerRole[];
  relocate?: boolean;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  /** 0-100, the quest's XP when the profile was created. */
  profileStrength?: number;
}

export const DEMO_PROFILES: Record<CareerType, AuthUser> = {
  engineering: {
    id: 'demo-eng',
    name: 'Alex Chen',
    email: 'alex.chen@dev.example',
    careerType: 'engineering',
    title: 'Senior Distributed Systems Engineer',
    avatarInitials: 'AC',
    connectedSources: ['github', 'linkedin', 'resume'],
    resumeName: 'Alex_Chen_Staff_Systems_CV.pdf',
    skills: ['TypeScript', 'Go', 'Distributed Systems', 'Kubernetes', 'PostgreSQL', 'React'],
    targetComp: '$180k – $230k',
    workPreference: 'remote',
    dealPriorities: ['High Async Culture', 'Cutting-Edge Stack', 'Equity Upside'],
    dealsMatched: 14,
    matchScore: 98,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
  design: {
    id: 'demo-design',
    name: 'Elena Rostova',
    email: 'elena@design.example',
    careerType: 'design',
    title: 'Lead Product Designer & Design Systems',
    avatarInitials: 'ER',
    connectedSources: ['portfolio', 'linkedin', 'resume'],
    resumeName: 'Elena_Rostova_Design_Folio.pdf',
    skills: ['Figma', 'Design Systems', 'UX Research', 'Micro-Interactions', 'Prototyping'],
    targetComp: '$165k – $200k',
    workPreference: 'remote',
    dealPriorities: ['Design-Centric Culture', 'Product Ownership', 'Work-Life Balance'],
    dealsMatched: 11,
    matchScore: 97,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
  'data-ai': {
    id: 'demo-ai',
    name: 'Dr. Marcus Vance',
    email: 'm.vance@ai-lab.example',
    careerType: 'data-ai',
    title: 'Staff ML & Generative AI Researcher',
    avatarInitials: 'MV',
    connectedSources: ['github', 'linkedin', 'resume'],
    resumeName: 'Marcus_Vance_PhD_AI_Dossier.pdf',
    skills: ['PyTorch', 'LLM Fine-Tuning', 'MLOps', 'Vector Search', 'CUDA', 'Python'],
    targetComp: '$220k – $310k',
    workPreference: 'remote',
    dealPriorities: ['GPU Compute Access', 'Frontier Research', 'High Equity Pool'],
    dealsMatched: 16,
    matchScore: 99,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
  'product-growth': {
    id: 'demo-pm',
    name: 'Maya Lin',
    email: 'maya.lin@growth.example',
    careerType: 'product-growth',
    title: 'Principal Product Manager · Core Growth',
    avatarInitials: 'ML',
    connectedSources: ['linkedin', 'resume', 'portfolio'],
    resumeName: 'Maya_Lin_Product_Leadership.pdf',
    skills: ['Product Strategy', 'PLG Growth', 'Metrics & SQL', '0-to-1 Shipping', 'User Research'],
    targetComp: '$190k – $240k',
    workPreference: 'hybrid',
    dealPriorities: ['Executive Autonomy', 'High Revenue Impact', 'Modern Team'],
    dealsMatched: 9,
    matchScore: 95,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
  executive: {
    id: 'demo-exec',
    name: 'Devon Hayes',
    email: 'd.hayes@executive.example',
    careerType: 'executive',
    title: 'VP of Engineering & Technology Strategy',
    avatarInitials: 'DH',
    connectedSources: ['linkedin', 'resume'],
    resumeName: 'Devon_Hayes_Executive_Summary.pdf',
    skills: ['Org Scaling (150+ engineers)', 'P&L Management', 'Tech Roadmapping', 'Board Advisory'],
    targetComp: '$280k – $400k',
    workPreference: 'remote',
    dealPriorities: ['Founder Relationship', 'Significant Equity / Options', 'Strategic Vision'],
    dealsMatched: 7,
    matchScore: 96,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
  'career-switcher': {
    id: 'demo-switch',
    name: 'Jordan Taylor',
    email: 'jordan.t@switch.example',
    careerType: 'career-switcher',
    title: 'Junior Software Engineer (Ex-Finance Analyst)',
    avatarInitials: 'JT',
    connectedSources: ['github', 'resume'],
    resumeName: 'Jordan_Taylor_Tech_Transition.pdf',
    skills: ['JavaScript', 'React', 'Python', 'Financial Modeling', 'Fast Learner'],
    targetComp: '$95k – $125k',
    workPreference: 'any',
    dealPriorities: ['Senior Mentorship', 'Structured Progression', 'Supportive Culture'],
    dealsMatched: 12,
    matchScore: 94,
    agentStatus: 'active',
    lastAnalyzedAt: 'Just now',
  },
};

const SESSION_KEY = 'kola:agent_user_session';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activePersona: CareerPersona;
  loginWithDemo: (type: CareerType) => void;
  loginWithCustom: (user: Partial<AuthUser> & { name: string; email: string; careerType: CareerType }) => void;
  switchCareerType: (type: CareerType) => void;
  logout: () => void;
  toggleDataSource: (source: DataSourceType) => void;
  /** Saves a new accent colour on the profile. */
  setAccentColor: (hex: string) => void;
  /** Re-tints the page without saving (live picking). Pass null to go back to the saved colour. */
  previewAccent: (hex: string | null) => void;
  isSimulatingAnalysis: boolean;
  startAnalysisSimulation: (callback?: () => void) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSavedSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // By default, start with the engineering demo profile so the site feels fully populated,
  // or restore from saved session.
  const [user, setUser] = useState<AuthUser | null>(() => loadSavedSession() || DEMO_PROFILES.engineering);
  const [isSimulatingAnalysis, setIsSimulatingAnalysis] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // storage unavailable
    }
  }, [user]);

  // Paint the profile's accent. Layout effect, so the new colour is in place before the browser paints.
  const savedAccent = normalizeHex(user?.accentColor) ?? DEFAULT_ACCENT;
  const savedAccentRef = useRef(savedAccent);
  savedAccentRef.current = savedAccent;
  useLayoutEffect(() => {
    applyAccent(savedAccent, { persist: true });
  }, [savedAccent]);

  const previewAccent = useCallback((hex: string | null) => {
    applyAccent(hex ?? savedAccentRef.current, { persist: false });
  }, []);

  const setAccentColor = useCallback((hex: string) => {
    const accentColor = normalizeHex(hex) ?? DEFAULT_ACCENT;
    setUser((prev) => (prev ? { ...prev, accentColor } : prev));
  }, []);

  const activePersona = useMemo(() => {
    const type = user?.careerType ?? 'engineering';
    return CAREER_PERSONAS[type] ?? CAREER_PERSONAS.engineering;
  }, [user?.careerType]);

  const loginWithDemo = (type: CareerType) => {
    const profile = DEMO_PROFILES[type] ?? DEMO_PROFILES.engineering;
    setUser({ ...profile });
  };

  const loginWithCustom = (custom: Partial<AuthUser> & { name: string; email: string; careerType: CareerType }) => {
    const base = DEMO_PROFILES[custom.careerType] ?? DEMO_PROFILES.engineering;
    const initials = custom.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'KO';

    setUser({
      ...base,
      id: `user-${Date.now()}`,
      name: custom.name,
      email: custom.email,
      careerType: custom.careerType,
      avatarInitials: initials,
      title: custom.title || `${CAREER_PERSONAS[custom.careerType].label} Specialist`,
      connectedSources: custom.connectedSources || ['linkedin', 'resume'],
      resumeName: custom.resumeName,
      skills: custom.skills && custom.skills.length > 0 ? custom.skills : base.skills,
      targetComp: custom.targetComp || base.targetComp,
      workPreference: custom.workPreference || 'remote',
      dealPriorities: custom.dealPriorities || base.dealPriorities,
      accentColor: normalizeHex(custom.accentColor) ?? DEFAULT_ACCENT,
      seniority: custom.seniority,
      roles: custom.roles,
      relocate: custom.relocate,
      linkedinUrl: custom.linkedinUrl,
      githubUrl: custom.githubUrl,
      portfolioUrl: custom.portfolioUrl,
      profileStrength: custom.profileStrength,
      // A fuller profile matches better: strength drives the demo numbers when it is known.
      dealsMatched: custom.profileStrength !== undefined ? 4 + Math.round(custom.profileStrength / 7) : Math.floor(Math.random() * 8) + 10,
      matchScore: custom.profileStrength !== undefined ? Math.min(99, 70 + Math.round(custom.profileStrength * 0.29)) : Math.floor(Math.random() * 6) + 94,
      agentStatus: 'active',
      lastAnalyzedAt: 'Just now',
    });
  };

  const switchCareerType = (type: CareerType) => {
    if (!user) {
      loginWithDemo(type);
      return;
    }
    const template = DEMO_PROFILES[type];
    setUser((prev) => {
      if (!prev) return template;
      return {
        ...prev,
        careerType: type,
        title: template.title,
        skills: template.skills,
        targetComp: template.targetComp,
        dealsMatched: template.dealsMatched,
        matchScore: template.matchScore,
        lastAnalyzedAt: 'Just now',
      };
    });
  };

  const toggleDataSource = (source: DataSourceType) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      const exists = prev.connectedSources.includes(source);
      const nextSources = exists
        ? prev.connectedSources.filter((s) => s !== source)
        : [...prev.connectedSources, source];
      return {
        ...prev,
        connectedSources: nextSources,
      };
    });
  };

  const startAnalysisSimulation = (callback?: () => void) => {
    setIsSimulatingAnalysis(true);
    setTimeout(() => {
      setIsSimulatingAnalysis(false);
      if (callback) callback();
    }, 1800);
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      activePersona,
      loginWithDemo,
      loginWithCustom,
      switchCareerType,
      logout,
      toggleDataSource,
      setAccentColor,
      previewAccent,
      isSimulatingAnalysis,
      startAnalysisSimulation,
    }),
    [user, activePersona, isSimulatingAnalysis, setAccentColor, previewAccent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
