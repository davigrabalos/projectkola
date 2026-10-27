/* Skill dictionary: one canonical name per skill, with the spellings that mean it.
   Used to pull skills out of real job descriptions (Worker) and to score matches (app).
   No dependencies on purpose: the Worker imports this file too. */

const SKILLS: [name: string, ...aliases: string[]][] = [
  ['TypeScript'], ['JavaScript'], ['React', 'react.js', 'reactjs'], ['Next.js', 'nextjs'], ['Vue', 'vue.js', 'vuejs'], ['Angular'],
  ['Node.js', 'nodejs'], ['CSS'], ['HTML'], ['Accessibility', 'a11y', 'wcag'], ['GraphQL'], ['REST', 'rest api', 'restful'],
  ['Python'], ['Go', 'golang'], ['Java'], ['Kotlin'], ['Scala'], ['Rust'], ['C++', 'cpp'], ['C#', '.net', 'dotnet'], ['Ruby', 'rails', 'ruby on rails'],
  ['PHP'], ['Elixir'], ['Swift', 'ios'], ['Android'], ['Flutter'], ['React Native'],
  ['PostgreSQL', 'postgres'], ['MySQL'], ['MongoDB'], ['Redis'], ['Kafka'], ['Elasticsearch'], ['SQL'],
  ['Kubernetes', 'k8s'], ['Docker'], ['Terraform'], ['AWS', 'amazon web services'], ['GCP', 'google cloud'], ['Azure'],
  ['Linux'], ['CI/CD', 'continuous integration'], ['Distributed Systems', 'distributed systems'], ['Microservices'], ['Observability'],
  ['Security', 'cybersecurity', 'infosec'],
  ['Machine Learning', 'ml', 'machine-learning'], ['PyTorch'], ['TensorFlow'], ['LLM', 'llms', 'large language model'], ['MLOps'],
  ['Data Analysis', 'data analytics'], ['Spark', 'pyspark'], ['dbt'], ['Airflow'], ['Snowflake'], ['BigQuery'], ['Tableau'], ['Power BI', 'powerbi'], ['Statistics'],
  ['Figma'], ['Design Systems', 'design system'], ['UX Research', 'user research'], ['Prototyping'], ['UI Design', 'interface design'], ['Interaction Design'],
  ['Product Strategy', 'product management'], ['Agile', 'scrum'], ['Stakeholder Management'], ['Leadership', 'people management'], ['Mentoring'],
  ['SEO'], ['Content Marketing'], ['Performance Marketing', 'paid acquisition'], ['CRM', 'salesforce', 'hubspot'], ['Copywriting'],
  ['Customer Success'], ['Sales', 'account executive', 'business development'], ['Excel'], ['Financial Modelling', 'financial modeling'],
  ['Communication'], ['English'], ['German'], ['French'], ['Spanish'], ['Portuguese'],
];

/* Names that are also everyday words ("go live", "the rest", "excel at", "swift", "spark"):
   they only count when written as the proper noun. Their aliases (golang, rest api...) match in any case. */
const CASE_SENSITIVE = new Set(['Go', 'REST', 'Excel', 'Swift', 'Spark', 'Rust', 'Sales']);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);

/* Word-ish boundaries that still work for "C++", "C#", ".net" and "Node.js". A trailing hyphen
   ("go-to-market") does not count as the skill. */
const bounded = (alts: string[], flags: string) =>
  new RegExp(`(^|[^A-Za-z0-9+#.])(${alts.map(escape).join('|')})(?![A-Za-z0-9+#-])`, flags);

const PATTERNS = SKILLS.map(([name, ...aliases]) => {
  const strict = CASE_SENSITIVE.has(name);
  const loose = strict ? aliases : [name, ...aliases];
  return {
    name,
    tests: [
      ...(strict ? [bounded([name], '')] : []),
      ...(loose.length ? [bounded(loose.map((a) => a.toLowerCase()), 'i')] : []),
    ],
  };
});

const matches = (tests: RegExp[], text: string) => tests.some((re) => re.test(text));

/** Canonical skills mentioned in a text, in dictionary order, at most `limit`. */
export function extractSkills(text: string, limit = 8): string[] {
  const found: string[] = [];
  for (const { name, tests } of PATTERNS) {
    if (matches(tests, text)) found.push(name);
    if (found.length >= limit) break;
  }
  return found;
}

/** Canonical name for a free-typed skill ("postgres" -> "PostgreSQL"), or the input trimmed. */
export function canonicalSkill(input: string): string {
  const s = input.trim();
  for (const { name, tests } of PATTERNS) if (s.length <= name.length + 12 && matches(tests, s)) return name;
  return s;
}
