import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as m from 'motion/react-m';
import { brand } from '../brand/brand';
import { SearchBar } from '../components/SearchBar';
import { Illustration, type IllustrationName } from '../components/Illustration';
import { JobCard, JobCardSkeletons } from '../components/JobCard';
import { HeroShortlist, type ShortlistItem } from '../components/HeroShortlist';
import { RotatingWord } from '../components/RotatingWord';
import { Drawer } from '../components/Drawer';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { Icon, type IconName } from '../components/Icon';
import { useCompanies, useJobList, useMeta } from '../hooks/useData';
import { ApplyAction } from '../components/ApplyAction';
import { formatSalary } from '../lib/format';
import { profileOf, topMatches, TRACK_CATEGORY } from '../lib/match';
import type { Job } from '../data/types';
import { serializeFilters } from '../lib/filters';
import { rise, stagger } from '../lib/motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/Auth';

const CATEGORY_ICONS: Record<string, IconName> = {
  Engineering: 'code', Design: 'pen', Data: 'chart', Healthcare: 'heart', Marketing: 'megaphone',
  'Customer success': 'users', Operations: 'truck', Product: 'target', Sales: 'money',
};
/** Shown (with "––") until /api/meta answers, so the grid doesn't jump. */
const PLACEHOLDER_CATEGORIES = ['Engineering', 'Data', 'Design', 'Product', 'Sales', 'Marketing', 'Customer success', 'Operations'];

const POPULAR = ['Frontend', 'Designer', 'Data', 'Remote', 'Internship'];

const STEPS: { title: string; text: string; art: IllustrationName }[] = [
  { title: 'We read the boards', text: 'Kola checks the career pages of companies hiring across Europe and Brazil every few hours, so every job is real and still open.', art: 'searching-everywhere' },
  { title: 'You tell us what fits', text: 'A three-minute profile: your skills, level, how you like to work and the pay you are after.', art: 'personal-goals' },
  { title: 'We rank, you apply', text: 'Every job gets a match score with the reasons behind it. Apply on the company’s own site, with nothing in between.', art: 'career-growth' },
];

/** Stagger index for CSS entrance animations. */
const i = (n: number) => ({ '--i': n }) as CSSProperties;

/** Below-the-fold reveals use Motion's in-view trigger (engine is lazy-loaded). */
const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } } as const;

const fmt = (n: number | undefined) => (n === undefined ? '–' : n.toLocaleString('en'));
const jobsLabel = (n: number | undefined) => (n === undefined ? '–– jobs' : `${fmt(n)} job${n === 1 ? '' : 's'}`);

export default function Home() {
  useDocumentTitle();
  const navigate = useNavigate();
  const search = (q: string, where: string) => navigate(`/jobs?${serializeFilters({ q, where })}`);
  const { user, activePersona } = useAuth();
  // One request for the newest jobs: signed out, the hero shows the first 3 and "Just posted" the next 6.
  const { jobs: latest, isLoading } = useJobList({ sort: 'recent' }, 9);
  const { data: meta } = useMeta();
  const { data: companies } = useCompanies();
  const showSkeleton = useDelayedFlag(isLoading);

  // Signed in: the newest 50 jobs on the active track (plus the newest overall), ranked against the profile (lib/match.ts).
  const track = user ? TRACK_CATEGORY[user.careerType] : null;
  const pool = useJobList(
    track ? { category: track, sort: 'recent' } : user?.careerType === 'executive' ? { level: ['lead'], sort: 'recent' } : { sort: 'recent' },
    50,
    Boolean(user),
  );
  const profile = useMemo(() => (user ? profileOf(user) : null), [user]);
  const deals = useMemo(() => {
    if (!profile) return [];
    const ids = new Set(pool.jobs.map((j) => j.id));
    return topMatches([...pool.jobs, ...latest.filter((j) => !ids.has(j.id))], profile, 3);
  }, [pool.jobs, latest, profile]);
  const shortlist: ShortlistItem[] = user ? deals : latest.slice(0, 3).map((job) => ({ job }));
  const inHero = new Set(shortlist.map((s) => s.job.id));
  const fresh = latest.filter((j) => !inHero.has(j.id)).slice(0, 6);
  const strong = deals.filter((d) => d.match.score >= 70).length;
  const [selectedDeal, setSelectedDeal] = useState<ShortlistItem | null>(null);

  const categories = [...(meta?.categories ?? PLACEHOLDER_CATEGORIES.map((name) => ({ name, count: undefined as number | undefined })))]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const { lead, pre, cities, still, label } = brand.signature.heroHeadline;

  return (
    <>
      {/* Hero: CSS entrance so it paints immediately, without waiting for JS. */}
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="hero__badge anim-rise" style={i(0)}>
              <span className="pulse-dot" />
              <span className="hero__badge-text">
                {user
                  ? `Hi ${user.name.split(' ')[0]} · ${strong ? `${strong} strong match${strong === 1 ? '' : 'es'}` : 'Your shortlist'} on your ${activePersona.badge} track`
                  : `Live · ${fmt(meta?.total)} open roles across Europe and Brazil`}
              </span>
            </p>
            <h1 className="anim-rise" style={i(1)}>
              <span className="visually-hidden">{label}</span>
              <span aria-hidden="true">
                <span className="hero__line">{lead}</span>
                <span className="hero__line">{pre} <RotatingWord words={cities} still={still} /></span>
              </span>
            </h1>
            <p className="hero__subtitle anim-rise" style={i(2)}>{brand.heroSubtitle(companies?.length)}</p>
            <div className="hero__search anim-rise" style={i(3)}><SearchBar onSearch={search} size="lg" /></div>
            <div className="hero__popular anim-rise" style={i(4)}>
              <span>Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p} to={p === 'Remote' ? '/jobs?mode=remote' : p === 'Internship' ? '/jobs?type=internship' : `/jobs?q=${encodeURIComponent(p)}`}>{p}</Link>
              ))}
            </div>
            <dl className="stats anim-rise" style={i(5)}>
              <div><dt>Open roles</dt><dd><strong>{fmt(meta?.total)}</strong></dd></div>
              <div><dt>Companies</dt><dd><strong>{fmt(companies?.length)}</strong></dd></div>
              <div><dt>Remote</dt><dd><strong>{fmt(meta?.remote)}</strong></dd></div>
            </dl>
          </div>
          <HeroShortlist
            items={shortlist}
            loading={user ? pool.isLoading : isLoading}
            onOpen={user ? setSelectedDeal : undefined}
          />
        </div>
      </section>

      {/* Just posted */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Just posted</span>
              <h2>Fresh from the boards</h2>
              <p>The newest openings, straight from each company’s own careers page.</p>
            </div>
            <Link to="/jobs?sort=recent" className="btn btn--secondary btn--sm">See all jobs<Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="job-grid" aria-busy={isLoading}>
            {isLoading
              ? showSkeleton && <JobCardSkeletons count={6} asListItems={false} />
              : fresh.map((j, n) => <JobCard key={j.id} job={j} index={n} />)}
          </div>
        </div>
      </section>

      {/* Categories: the biggest field gets the large tile. */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Browse</span>
              <h2>Browse by field</h2>
            </div>
          </div>
          <m.div className="tile-grid" variants={stagger(0.04)} {...inView}>
            {categories.map((c, n) => (
              <m.div key={c.name} className={`tile-cell${n === 0 ? ' tile-cell--feature' : ''}`} variants={rise}>
                <Link to={`/jobs?category=${encodeURIComponent(c.name)}`} className="tile reveal">
                  <span className="tile__top">
                    <span className="tile__icon"><Icon name={CATEGORY_ICONS[c.name] ?? 'briefcase'} size={n === 0 ? 36 : 26} /></span>
                    {n !== 0 && <span className="tile__count">{jobsLabel(c.count)}</span>}
                  </span>
                  {n === 0 && <span className="tile__count tile__count--big">{c.count === undefined ? '––' : fmt(c.count)}<small>open jobs</small></span>}
                  <span className="tile__name">{c.name}</span>
                </Link>
              </m.div>
            ))}
            <m.div className="tile-cell" variants={rise}>
              <Link to="/jobs?mode=remote" className="tile tile--accent reveal">
                <span className="tile__top">
                  <span className="tile__icon"><Icon name="globe" size={26} /></span>
                  <span className="tile__count">{jobsLabel(meta?.remote)}</span>
                </span>
                <span className="tile__name">Remote, anywhere</span>
              </Link>
            </m.div>
          </m.div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">How it works</span>
              <h2>Less searching, better matches</h2>
            </div>
          </div>
          <m.ol className="steps" variants={stagger(0.08)} {...inView}>
            {STEPS.map((s) => (
              <m.li key={s.title} className="card step reveal" variants={rise}>
                <div className="step__art"><Illustration name={s.art} preset="step" /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </m.li>
            ))}
          </m.ol>
        </div>
      </section>

      <section className="container">
        <m.div className="cta-band glass" variants={rise} {...inView}>
          <div className="cta-band__text">
            <span className="eyebrow">{user ? 'Your profile' : 'Get started'}</span>
            <h2 style={{ marginTop: 'var(--space-2)' }}>{user ? 'Sharpen your matches' : 'See which jobs fit you'}</h2>
            <p>{user ? 'Add the skills you use every day and your scores get more precise.' : 'Build your profile in three minutes and every job gets a match score.'}</p>
            <Link to="/sign-in" className="btn btn--primary btn--lg">
              <Icon name={user ? 'user' : 'sparkles'} size={18} />
              {user ? 'Update your profile' : 'Build your profile'}
            </Link>
          </div>
          <Illustration name="ai-personal-assistant" className="cta-band__art" preset="hero" />
        </m.div>
      </section>

      {/* Deal analysis: why this job ranked where it did (lib/match.ts). */}
      <Drawer
        open={Boolean(selectedDeal)}
        onClose={() => setSelectedDeal(null)}
        title="Deal analysis"
        footer={
          selectedDeal && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
              <Link to={`/jobs/${selectedDeal.job.id}`} className="btn btn--secondary">View job</Link>
              <ApplyAction job={selectedDeal.job} style={{ flex: 1 }} />
            </div>
          )
        }
      >
        {selectedDeal?.match && <DealAnalysis job={selectedDeal.job} match={selectedDeal.match} track={activePersona.label} />}
      </Drawer>
    </>
  );
}

function DealAnalysis({ job, match, track }: { job: Job; match: NonNullable<ShortlistItem['match']>; track: string }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span className="tag tag--brand">{match.score}% Profile Match</span>
      </div>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)' }}>{job.title}</h2>
        <p style={{ color: 'var(--color-text)' }}>{job.company?.name} · {job.location}</p>
      </div>
      <dl className="job-facts">
        <div><dt>Compensation</dt><dd>{formatSalary(job.salary)}</dd></div>
        <div><dt>Skills in common</dt><dd>{match.matchedSkills.join(', ') || 'None listed yet'}</dd></div>
        <div><dt>Track</dt><dd>{track}</dd></div>
      </dl>
      {match.reasons.length > 0 && (
        <ul className="deal-reasons">
          {match.reasons.map((r) => <li key={r}><Icon name="check" size={14} />{r}</li>)}
        </ul>
      )}
      <p className="subtle">Scored from your profile's skills, level, work style and target pay. Add skills in your profile to sharpen it.</p>
    </div>
  );
}
