import type { EmploymentType, ExperienceLevel, JobProvider, SalaryPeriod, WorkMode } from '../src/data/types.ts';

/* Turning raw feed fields into Kola's job shape. Pure functions: no Worker APIs, so `npm run test:worker`
   covers them in Node. Inference is keyword based and deliberately conservative. */

/** One job, normalised, before it is written to D1. */
export interface NormalizedJob {
  id: string;
  provider: JobProvider;
  externalId: string;
  /** Board token (Greenhouse/Lever) used to fetch the full description later. Empty for Adzuna. */
  boardToken: string;
  companyId: string;
  companyName: string;
  title: string;
  category: string;
  location: string;
  country: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experience: ExperienceLevel;
  salary: { min: number; max: number; currency: string; period: SalaryPeriod } | null;
  postedAt: string;
  applyUrl: string;
  sourceUrl: string;
  summary: string;
  skills: string[];
}

/* ---------- Markets: Europe + Brazil ---------- */

/** [country code, pattern]. Order matters: specific places before regions. "EU" means Europe-wide/EMEA remote. */
const COUNTRIES: [string, RegExp][] = [
  ['BR', /\b(brazil|brasil|s[ãa]o paulo|rio de janeiro|belo horizonte|curitiba|florian[óo]polis|porto alegre|recife|campinas)\b/i],
  ['PT', /\b(portugal|lisbon|lisboa|porto|braga|coimbra|aveiro)\b/i],
  // Cities that also exist in the US (Cambridge, Birmingham, Oxford, Bristol...) are left out on purpose.
  ['GB', /\b(united kingdom|uk|england|scotland|wales|london|manchester|edinburgh|leeds|glasgow)\b/i],
  ['IE', /\b(ireland|dublin|cork|galway)\b/i],
  ['DE', /\b(germany|deutschland|berlin|munich|m[üu]nchen|hamburg|frankfurt|cologne|k[öo]ln|d[üu]sseldorf|stuttgart|leipzig|chemnitz)\b/i],
  ['FR', /\b(france|paris|lyon|marseille|toulouse|lille|bordeaux|nantes|montpellier)\b/i],
  ['ES', /\b(spain|espa[ñn]a|madrid|barcelona|valencia|seville|sevilla|malaga|m[áa]laga|bilbao)\b/i],
  ['NL', /\b(netherlands|holland|amsterdam|rotterdam|utrecht|the hague|eindhoven)\b/i],
  ['BE', /\b(belgium|brussels|antwerp|ghent)\b/i],
  ['IT', /\b(italy|italia|milan|milano|rome|roma|turin|torino)\b/i],
  ['CH', /\b(switzerland|zurich|z[üu]rich|geneva|basel|lausanne)\b/i],
  ['AT', /\b(austria|vienna|wien|graz)\b/i],
  ['PL', /\b(poland|warsaw|warszawa|krak[óo]w|wroc[łl]aw|gda[ńn]sk|pozna[ńn])\b/i],
  ['CZ', /\b(czech|czechia|prague|praha|brno)\b/i],
  ['SE', /\b(sweden|stockholm|gothenburg|g[öo]teborg|malm[öo])\b/i],
  ['DK', /\b(denmark|copenhagen|aarhus)\b/i],
  ['NO', /\b(norway|oslo)\b/i],
  ['FI', /\b(finland|helsinki)\b/i],
  ['EE', /\b(estonia|tallinn)\b/i],
  ['LT', /\b(lithuania|vilnius)\b/i],
  ['LV', /\b(latvia|riga)\b/i],
  ['RO', /\b(romania|bucharest|cluj)\b/i],
  ['GR', /\b(greece|athens)\b/i],
  ['HU', /\b(hungary|budapest)\b/i],
  ['BG', /\b(bulgaria|sofia)\b/i],
  ['HR', /\b(croatia|zagreb)\b/i],
  ['RS', /\b(serbia|belgrade)\b/i],
  ['LU', /\b(luxembourg)\b/i],
  ['EU', /\b(europe|emea|eu)\b/i],
];

/** Country code for a location in Kola's markets, or null when it is outside them. */
export function marketOf(location: string, countryHint?: string): string | null {
  const hint = countryHint?.toUpperCase();
  if (hint && COUNTRIES.some(([code]) => code === hint)) return hint;
  if (hint === 'UK') return 'GB';
  for (const [code, re] of COUNTRIES) if (re.test(location)) return code;
  return null;
}

/* ---------- Job attributes ---------- */

export function inferWorkMode(...texts: (string | undefined)[]): WorkMode {
  const t = texts.filter(Boolean).join(' ');
  if (/\bhybrid\b/i.test(t)) return 'hybrid';
  if (/\bremote\b|\bwork from home\b|\bhome[- ]based\b|\bdistributed\b/i.test(t)) return 'remote';
  return 'on-site';
}

export function inferExperience(title: string): ExperienceLevel {
  if (/\b(intern|internship|trainee|apprentice|working student|werkstudent|est[áa]gio|estagi[áa]rio|graduate|junior|jr\.?|entry[- ]level)\b/i.test(title)) return 'entry';
  // "Manager" alone is not a level: product, account and program managers are individual contributors.
  if (/\b(head of|director|vp|vice president|chief|lead|principal|engineering manager|people manager|team manager)\b/i.test(title)) return 'lead';
  if (/\b(senior|sr\.?|staff|expert|advanced)\b/i.test(title)) return 'senior';
  return 'mid';
}

export function inferEmploymentType(...texts: (string | undefined)[]): EmploymentType {
  const t = texts.filter(Boolean).join(' ');
  if (/\b(intern|internship|working student|werkstudent|est[áa]gio|trainee)\b/i.test(t)) return 'internship';
  if (/\b(contract|contractor|freelance|fixed[- ]term|temporary|temp)\b/i.test(t)) return 'contract';
  if (/\bpart[- ]time\b/i.test(t)) return 'part-time';
  return 'full-time';
}

/** Kola's categories (the Home tiles and the filter list). First match wins, so the order matters:
    designer roles first, then data and engineering, and the generic "design" words only near the end
    (so "Design Systems Engineer" is Engineering). */
const CATEGORIES: [string, RegExp][] = [
  ['Design', /\b(designer|ux|ui|user experience|illustrator)\b/i],
  ['Data', /\b(data|analytics?|analyst|machine learning|ml|ai|scientist|bi|business intelligence|statistics?|statistician)\b/i],
  ['Engineering', /\b(engineer(ing)?|developer|devops|sre|software|platform|infrastructure|security|qa|tester|architect|programmer|frontend|front-end|backend|back-end|full[- ]?stack|mobile|ios|android)\b/i],
  ['Product', /\bproduct (manager|owner|lead|management|director|operations)\b|\bhead of product\b/i],
  ['Marketing', /\b(marketing|growth|seo|content|brand|communications?|pr|social media|copywriter)\b/i],
  ['Sales', /\b(sales|account executive|business development|bdr|sdr|partnerships?|account manager)\b/i],
  ['Customer success', /\b(customer|support|success|service desk|client)\b/i],
  ['Healthcare', /\b(nurse|nursing|clinical|medical|healthcare|doctor|physician|pharmacist)\b/i],
  ['Operations', /\b(operations?|finance|financial|accounting|accountant|legal|counsel|people|hr|recruit(er|ing|ment)?|talent|logistics|procurement|office|admin|payroll|compliance|risk|treasury|tax)\b/i],
  ['Design', /\b(design|visual|creative)\b/i],
];

/** Texts are tried in order, so pass the source's own department/team first and the title last:
    "Analyst Relations Manager" in a Marketing department is Marketing, not Data. */
export function inferCategory(...texts: (string | undefined)[]): string {
  for (const t of texts) {
    if (!t) continue;
    for (const [name, re] of CATEGORIES) if (re.test(t)) return name;
  }
  return 'Operations';
}

/* ---------- Text helpers ---------- */

const ENTITIES: Record<string, string> = {
  lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€', pound: '£', bull: '•', middot: '·',
};

/** Greenhouse sends description HTML entity-escaped. `&amp;` is decoded last so "&amp;lt;" stays literal. */
export function unescapeHtml(s: string): string {
  return s
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (m, n: string) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : parseInt(n, 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    })
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&amp;/g, '&');
}

/** Plain text from HTML: tags dropped, whitespace collapsed. Good enough for summaries and skill matching. */
export function htmlToText(html: string): string {
  return unescapeHtml(html.replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** First sentences of a text, cut at a word boundary, at most `max` characters. */
export function summarize(text: string, max = 220): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
}

/** Lowercase without accents, for accent-insensitive matching ("sao paulo" = "São Paulo"). */
export const foldText = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Annual figure for sorting by pay (same multipliers as the app's `annualised`). */
export function annualMax(s: NormalizedJob['salary']): number | null {
  if (!s) return null;
  return s.max * (s.period === 'year' ? 1 : s.period === 'month' ? 12 : 1800);
}

/** Stable fingerprint of what we store, so unchanged jobs are not rewritten (D1 counts every written row). */
export function fingerprint(j: NormalizedJob): string {
  const s = JSON.stringify([j.title, j.companyName, j.category, j.location, j.country, j.workMode, j.employmentType, j.experience, j.salary, j.postedAt, j.applyUrl, j.summary, j.skills]);
  let h1 = 0x811c9dc5;
  let h2 = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 31) + c) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}
