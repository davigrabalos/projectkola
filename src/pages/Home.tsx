import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as m from 'motion/react-m';
import { brand } from '../brand/brand';
import { SearchBar } from '../components/SearchBar';
import { Illustration } from '../components/Illustration';
import { JobCard, JobCardSkeletons } from '../components/JobCard';
import { Drawer } from '../components/Drawer';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { Icon, type IconName } from '../components/Icon';
import { useCompanies, useJobList, useMeta } from '../hooks/useData';
import { ApplyAction } from '../components/ApplyAction';
import { formatSalary } from '../lib/format';
import { profileOf, topMatches, TRACK_CATEGORY, type Match } from '../lib/match';
import type { Job } from '../data/types';
import { serializeFilters } from '../lib/filters';
import { rise, stagger } from '../lib/motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth, CAREER_PERSONAS, type CareerType } from '../context/Auth';

const CATEGORY_ICONS: Record<string, IconName> = {
  Engineering: 'code', Design: 'pen', Data: 'chart', Healthcare: 'heart', Marketing: 'megaphone',
  'Customer success': 'users', Operations: 'truck', Product: 'target', Sales: 'money',
};
/** Shown (with "––") until /api/meta answers, so the grid doesn't jump. */
const PLACEHOLDER_CATEGORIES = ['Engineering', 'Data', 'Design', 'Product', 'Sales', 'Marketing', 'Customer success', 'Operations'];

const POPULAR = ['Frontend', 'Designer', 'Data', 'Remote', 'Internship'];

/** Stagger index for CSS entrance animations. */
const i = (n: number) => ({ '--i': n }) as CSSProperties;

/** Below-the-fold reveals use Motion's in-view trigger (engine is lazy-loaded). */
const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } } as const;

export default function Home() {
  useDocumentTitle();
  const navigate = useNavigate();
  const search = (q: string, where: string) => navigate(`/jobs?${serializeFilters({ q, where })}`);
  const { jobs: latest, isLoading } = useJobList({ sort: 'recent' }, 6);
  const { data: meta } = useMeta();
  const { data: companies } = useCompanies();
  const { user, activePersona, switchCareerType } = useAuth();
  const showSkeleton = useDelayedFlag(isLoading);
  const count = (n: number | undefined) => (n === undefined ? '–' : n.toLocaleString('en'));

  // Bespoke deals: the newest 50 jobs on the active track, ranked against the profile (lib/match.ts).
  const track = user ? TRACK_CATEGORY[user.careerType] : null;
  const pool = useJobList(
    track ? { category: track, sort: 'recent' } : user?.careerType === 'executive' ? { level: ['lead'], sort: 'recent' } : { sort: 'recent' },
    50,
  );
  const profile = useMemo(() => (user ? profileOf(user) : null), [user]);
  const deals = useMemo(() => (profile ? topMatches(pool.jobs, profile, 3) : []), [pool.jobs, profile]);
  const [selectedDeal, setSelectedDeal] = useState<{ job: Job; match: Match } | null>(null);
  const categories = meta?.categories ?? PLACEHOLDER_CATEGORIES.map((name) => ({ name, count: undefined }));
  const { before, highlight, after } = brand.signature.heroHeadline;

  return (
    <>
      {/* Hero: CSS entrance so it paints immediately, without waiting for JS. */}
      <section className="hero">
        <div className="container">
          <div className="hero__intro">
            <div>
              <span className="hero__badge anim-rise" style={i(0)}>
                <span className="pulse-dot" />
                {user ? `Agent Kola active for ${user.name} · ${activePersona.badge}` : 'Autonomous AI Career Agent'}
              </span>
              <h1 className="anim-rise" style={i(1)}>{before} <span className="brand-highlight">{highlight}</span> {after}</h1>
              <p className="hero__subtitle anim-rise" style={i(2)}>{brand.heroSubtitle}</p>
            </div>
            <Illustration name="ai-personal-assistant" className="hero__art" preset="hero" />
          </div>

          {/* Dynamic Agent Telemetry Banner */}
          <div className="anim-rise" style={{ ...i(3), margin: 'var(--space-4) 0 var(--space-6)' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                maxWidth: '100%',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--glass-bg-strong)',
                border: 'var(--border-width) solid var(--color-border-strong)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="pulse-dot" />
                <strong>Scouting Deal Track:</strong>
                <span className="tag tag--brand">{activePersona.badge}</span>
              </div>
              <span className="subtle">Target Comp: <strong>{user?.targetComp || activePersona.dealRange}</strong></span>
              <span className="subtle">Match Rate: <strong style={{ color: 'var(--color-success)' }}>{user?.matchScore || 98}%</strong></span>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginLeft: 'auto' }}>
                <span className="field__hint" style={{ marginRight: 4 }}>TEST PERSONA:</span>
                {(['engineering', 'design', 'data-ai', 'career-switcher'] as CareerType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchCareerType(t)}
                    className="tag"
                    style={{
                      cursor: 'pointer',
                      border: user?.careerType === t ? '1px solid var(--color-brand)' : undefined,
                      background: user?.careerType === t ? 'var(--color-brand-subtle)' : undefined,
                      color: user?.careerType === t ? 'var(--color-brand-strong)' : undefined,
                    }}
                  >
                    {CAREER_PERSONAS[t].badge}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hero__search anim-rise" style={i(4)}><SearchBar onSearch={search} size="lg" /></div>
          <div className="hero__popular anim-rise" style={i(5)}>
            <span>Target Tracks:</span>
            {POPULAR.map((p) => (
              <Link key={p} to={p === 'Remote' ? '/jobs?mode=remote' : p === 'Internship' ? '/jobs?type=internship' : `/jobs?q=${encodeURIComponent(p)}`}>{p}</Link>
            ))}
          </div>
          <div className="stats anim-rise" style={i(6)}>
            <div><strong>{count(meta?.total)}</strong><span>Curated Deals</span></div>
            <div><strong>{count(companies?.length)}</strong><span>Hiring Partners</span></div>
            <div><strong>{count(meta?.remote)}</strong><span>Remote Deals</span></div>
          </div>
        </div>
      </section>

      {/* Featured Agent Deals for Active Persona */}
      <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">
                <Icon name="sparkles" size={14} /> Agent Intelligence
              </span>
              <h2>Bespoke Deals Curated for {activePersona.label}</h2>
              <p>Exclusive deals unlocked based on your ingested skills and compensation criteria.</p>
            </div>
            <Link to="/sign-in" className="btn btn--secondary btn--sm">
              <Icon name="refresh" size={14} />
              Update Ingested Data
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }} aria-busy={pool.isLoading}>
            {pool.isLoading ? (
              showSkeleton && <JobCardSkeletons count={3} asListItems={false} />
            ) : deals.length === 0 ? (
              <p className="subtle">No open roles on this track right now. Try another track or browse all deals.</p>
            ) : deals.map(({ job, match }) => (
              <div
                key={job.id}
                className="card glass reveal"
                style={{ display: 'grid', gap: 'var(--space-3)', cursor: 'pointer' }}
                onClick={() => setSelectedDeal({ job, match })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="tag tag--brand">{match.score}% Profile Match</span>
                  <span className="tag tag--accent">{activePersona.badge}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 2 }}>{job.title}</h3>
                  <p className="subtle" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{job.company?.name} · {job.location}</p>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-brand-strong)' }}>
                  {formatSalary(job.salary)}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                  ✓ {match.reasons[0] ?? 'New on your track'}
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ marginTop: 'var(--space-2)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeal({ job, match });
                  }}
                >
                  View Full Deal Analysis
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Categories</span>
              <h2>Browse by field</h2>
              <p>Explore opportunities matched across diverse industries.</p>
            </div>
          </div>
          <m.div className="tile-grid" variants={stagger(0.04)} {...inView}>
            {categories.map((c) => (
              <m.div key={c.name} className="tile-cell" variants={rise}>
                <Link to={`/jobs?category=${encodeURIComponent(c.name)}`} className="tile reveal">
                  <span className="tile__top">
                    <span className="tile__icon"><Icon name={CATEGORY_ICONS[c.name] ?? 'briefcase'} size={28} /></span>
                    <span className="tile__count">{c.count === undefined ? '––' : String(c.count).padStart(2, '0')}</span>
                  </span>
                  <span className="tile__name">{c.name}</span>
                </Link>
              </m.div>
            ))}
            <m.div className="tile-cell tile-cell--wide" variants={rise}>
              <Link to="/jobs?mode=remote" className="tile tile--accent reveal">
                <span className="tile__top">
                  <span className="tile__icon"><Icon name="pin" size={28} /></span>
                  <span className="tile__count">{meta ? String(meta.remote).padStart(2, '0') : '––'}</span>
                </span>
                <span className="tile__name">Remote, anywhere</span>
              </Link>
            </m.div>
          </m.div>
        </div>
      </section>

      {/* Fresh Latest Jobs */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Market Feed</span>
              <h2>Latest partner postings</h2>
              <p>Roles currently undergoing agent evaluation.</p>
            </div>
            <Link to="/jobs?sort=recent" className="btn btn--secondary btn--sm">See all deals<Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="job-grid" aria-busy={isLoading}>
            {isLoading
              ? showSkeleton && <JobCardSkeletons count={6} asListItems={false} />
              : latest.map((j, n) => (
                  <JobCard key={j.id} job={j} index={n} />
                ))}
          </div>
        </div>
      </section>

      {/* How It Works for an AI Career Agent */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">How Kola Works</span>
              <h2>Your career, negotiated autonomously</h2>
            </div>
          </div>
          <m.ol className="steps" variants={stagger(0.08)} {...inView}>
            <m.li className="card step reveal" variants={rise}>
              <h3>1. Ingest Data</h3>
              <p>Connect LinkedIn, GitHub, or drop your CV. Your agent ingests verified tenure, commits, and real accomplishments.</p>
            </m.li>
            <m.li className="card step reveal" variants={rise}>
              <h3>2. Neural Analysis</h3>
              <p>AI models analyze your career trajectory, skill rarity, and market compensation value for your specific persona.</p>
            </m.li>
            <m.li className="card step reveal" variants={rise}>
              <h3>3. Bespoke Deals</h3>
              <p>Skip cold applications. Receive inbound deal proposals with pre-matched compensation and cultural fit.</p>
            </m.li>
          </m.ol>
        </div>
      </section>

      <section className="container">
        <m.div className="cta-band glass" variants={rise} {...inView}>
          <div>
            <span className="eyebrow">Career Agent Onboarding</span>
            <h2 style={{ marginTop: 'var(--space-2)' }}>Ready to let your AI Agent scout for you?</h2>
            <p>Connect your data streams in 60 seconds and receive your personalized career dossier.</p>
          </div>
          <Link to="/sign-in" className="btn btn--primary btn--lg">
            <Icon name="sparkles" size={18} />
            Activate Your Agent
          </Link>
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
        {selectedDeal && (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="tag tag--brand">{selectedDeal.match.score}% Profile Match</span>
              <span className="tag tag--accent">{activePersona.badge}</span>
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)' }}>{selectedDeal.job.title}</h2>
              <p style={{ color: 'var(--color-text)' }}>{selectedDeal.job.company?.name} · {selectedDeal.job.location}</p>
            </div>
            <dl className="job-facts">
              <div><dt>Compensation</dt><dd>{formatSalary(selectedDeal.job.salary)}</dd></div>
              <div><dt>Skills in common</dt><dd>{selectedDeal.match.matchedSkills.join(', ') || 'None listed yet'}</dd></div>
              <div><dt>Track</dt><dd>{activePersona.label}</dd></div>
            </dl>
            {selectedDeal.match.reasons.length > 0 && (
              <ul className="deal-reasons">
                {selectedDeal.match.reasons.map((r) => <li key={r}><Icon name="check" size={14} />{r}</li>)}
              </ul>
            )}
            <p className="subtle">Scored from your profile's skills, level, work style and target pay. Add skills in your profile to sharpen it.</p>
          </div>
        )}
      </Drawer>
    </>
  );
}
