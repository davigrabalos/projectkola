import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../data/types';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '../data/types';
import type { Match } from '../lib/match';
import { formatSalary, timeAgo } from '../lib/format';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { CompanyLogo } from './CompanyLogo';
import { Icon } from './Icon';
import { Sk } from './Skeleton';

export interface ShortlistItem { job: Job; match?: Match }

const CYCLE_MS = 5000;

/**
 * The hero's live shortlist: three real jobs fanned like a hand of cards (pages.css, "Hero shortlist").
 * Wide screens: the front card moves to the back every 5 s, pausing on hover, focus, the pause button,
 * when off screen, in a hidden tab and under reduced motion; arrow keys and dots pick a card.
 * Narrow screens: a swipeable row, no cycling. Signed in, cards carry a match ring (score from lib/match.ts).
 */
export function HeroShortlist({ items, loading, onOpen }: {
  items: ShortlistItem[];
  loading: boolean;
  /** Signed in: open the deal analysis. Signed out, cards link to the job page instead. */
  onOpen?: (item: ShortlistItem) => void;
}) {
  const stacked = useMediaQuery('(min-width: 1080px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  // `prev` is the card that was in front before the last move: it plays the swing-to-the-back animation.
  const [{ front, prev }, setOrder] = useState({ front: 0, prev: -1 });
  const setFront = (next: (f: number) => number) => setOrder((o) => ({ front: next(o.front), prev: o.front }));
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false); // hover or focus inside
  const [inView, setInView] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const n = items.length;

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cycling = stacked && !reduced && !paused && !held && inView && n > 1;
  useEffect(() => {
    if (!cycling) return;
    const t = window.setInterval(() => { if (!document.hidden) setOrder((o) => ({ front: (o.front + 1) % n, prev: o.front })); }, CYCLE_MS);
    return () => window.clearInterval(t);
  }, [cycling, n]);

  useEffect(() => { if (front >= n) setOrder({ front: 0, prev: -1 }); }, [front, n]);

  if (loading && !n) return <ShortlistSkeleton />;
  if (!n) return null;

  const pos = (i: number) => (stacked ? (i - front + n) % n : 0);
  const wasFront = (i: number) => stacked && i === prev && pos(i) === n - 1;
  // Keyboard moves keep focus on the (new) front card; the old one becomes inert.
  const go = (d: number) => {
    setFront((f) => (f + d + n) % n);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[data-pos="0"] .shortlist__title > *')?.focus());
  };
  const onKey = (e: KeyboardEvent) => {
    if (!stacked) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
  };

  return (
    <div
      ref={ref}
      className="shortlist anim-rise"
      style={{ '--i': 3 } as CSSProperties}
      role="region"
      aria-roledescription="carousel"
      aria-label={onOpen ? 'Your top matches' : 'Just posted'}
      data-tilt={stacked && !reduced ? '' : undefined}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
      onKeyDown={onKey}
    >
      <div className="shortlist__stack">
        {items.map((item, i) => (
          <ShortlistCard
            key={item.job.id}
            item={item}
            pos={pos(i)}
            leaving={wasFront(i)}
            label={`${i + 1} of ${n}`}
            hidden={stacked && pos(i) !== 0}
            onOpen={onOpen}
            onBringForward={() => setFront(() => i)}
          />
        ))}
      </div>
      {stacked && n > 1 && (
        <div className="shortlist__controls">
          <div className="shortlist__dots">
            {items.map((item, i) => (
              <button
                key={item.job.id}
                type="button"
                className="shortlist__dot"
                aria-label={`Show job ${i + 1} of ${n}`}
                aria-current={i === front ? 'true' : undefined}
                onClick={() => setFront(() => i)}
              />
            ))}
          </div>
          {!reduced && (
            <button type="button" className="shortlist__pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play rotation' : 'Pause rotation'}>
              <Icon name={paused ? 'play' : 'pause'} size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShortlistCard({ item: { job, match }, pos, leaving, label, hidden, onOpen, onBringForward }: {
  item: ShortlistItem;
  pos: number;
  leaving: boolean;
  label: string;
  /** Behind the front card: out of the tab order and hidden from screen readers; a click brings it forward. */
  hidden: boolean;
  onOpen?: (item: ShortlistItem) => void;
  onBringForward: () => void;
}) {
  const tags = job.skills.length ? job.skills.slice(0, 4) : [WORK_MODE_LABELS[job.workMode], EMPLOYMENT_LABELS[job.employmentType]];
  const mine = new Set(match?.matchedSkills.map((s) => s.toLowerCase()));
  // Some boards list every office ("Berlin, Germany; Dresden, …"): show the first and a count.
  const [where, ...more] = job.location.split(/;\s*/);
  const inert = hidden ? { inert: '' } : {};
  return (
    <article
      className="shortlist__card reveal"
      data-pos={pos}
      data-leaving={leaving ? '' : undefined}
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={hidden || undefined}
      onClick={hidden ? onBringForward : undefined}
      {...inert}
    >
      <div className="shortlist__top">
        <CompanyLogo id={job.companyId} name={job.company?.name ?? '?'} />
        <div className="shortlist__who">
          <div className="shortlist__company">{job.company?.name}</div>
          <div className="shortlist__where">{where}{more.length > 0 && ` +${more.length} more`}</div>
        </div>
        {match ? (
          <div className="ring" style={{ '--score': match.score } as CSSProperties} role="img" aria-label={`${match.score}% match`}>
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle className="ring__track" cx="22" cy="22" r="19" pathLength={100} />
              <circle className="ring__fill" cx="22" cy="22" r="19" pathLength={100} />
            </svg>
            <span className="ring__num" aria-hidden="true" />
          </div>
        ) : (
          <span className="shortlist__posted">{timeAgo(job.postedAt)}</span>
        )}
      </div>
      <h3 className="shortlist__title">
        {onOpen ? (
          <button type="button" onClick={() => onOpen({ job, match })}>{job.title}</button>
        ) : (
          <Link to={`/jobs/${job.id}`}>{job.title}</Link>
        )}
      </h3>
      <div className={`shortlist__salary${job.salary ? '' : ' is-empty'}`}>{formatSalary(job.salary)}</div>
      <ul className="shortlist__tags" aria-label="Skills">
        {tags.map((t) => <li key={t} className={`tag${mine.has(t.toLowerCase()) ? ' tag--brand' : ''}`}>{t}</li>)}
      </ul>
      <div className="shortlist__foot">
        {match ? (
          <><Icon name="check" size={14} />{match.reasons[0] ?? 'New on your track'}</>
        ) : (
          <Link to="/sign-in">Sign in to see your match<Icon name="arrowRight" size={14} /></Link>
        )}
      </div>
    </article>
  );
}

function ShortlistSkeleton() {
  return (
    <div className="shortlist is-skeleton" aria-hidden="true">
      <div className="shortlist__stack">
        {[0, 1, 2].map((p) => (
          <div key={p} className="shortlist__card" data-pos={p}>
            <div className="shortlist__top">
              <div className="company-logo sk-box" />
              <div className="shortlist__who"><div className="shortlist__company"><Sk w="40%" /></div><div className="shortlist__where"><Sk w="55%" /></div></div>
            </div>
            <h3 className="shortlist__title"><Sk w="80%" /></h3>
            <div className="shortlist__salary"><Sk w="35%" /></div>
            <div className="shortlist__foot"><Sk w="60%" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
