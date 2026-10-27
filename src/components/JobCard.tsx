import { useRef, type CSSProperties } from 'react';
import { TransitionLink } from './TransitionLink';
import { AppliedTag } from './ApplyAction';
import { SourceNote } from './SourceNote';
import type { Job } from '../data/types';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '../data/types';
import { formatSalary, isNew, timeAgo } from '../lib/format';
import { prefetchJob } from '../hooks/useData';
import { CompanyLogo } from './CompanyLogo';
import { Icon } from './Icon';
import { SaveButton } from './SaveButton';
import { Sk } from './Skeleton';

type Props =
  | {
      job: Job;
      selected?: boolean;
      /** Position in a list, used to stagger the entrance animation. */
      index?: number;
      /** When provided (desktop split view), clicking selects instead of navigating. */
      onSelect?: (id: string) => void;
      /** Morph title + logo into the job page on navigation. Off where the page already shows a job title. */
      morph?: boolean;
      skeleton?: false;
    }
  | { skeleton: true; job?: undefined; selected?: undefined; index?: number; onSelect?: undefined; morph?: undefined };

/**
 * Follows the scanning order users expect from other job boards:
 * title > company > location/mode > salary > type > recency.
 * `skeleton` renders the same markup with grey blocks, so loading and loaded line up exactly.
 */
export function JobCard(props: Props) {
  return props.skeleton ? <JobCardSkeleton /> : <LoadedJobCard {...props} />;
}

function JobCardSkeleton() {
  {
    return (
      <article className="job-card is-skeleton" aria-hidden="true">
        <div className="company-logo sk-box" />
        <div className="job-card__body">
          <h3 className="job-card__title"><Sk w="70%" /></h3>
          <div className="job-card__company"><Sk w="35%" /></div>
          <div className="job-card__meta"><span><Sk w="7rem" /></span><span><Sk w="8rem" /></span></div>
          <div className="job-card__footer">
            <span className="tag sk-tag"><Sk w="3.5rem" /></span>
            <span className="tag sk-tag"><Sk w="4rem" /></span>
          </div>
        </div>
        <div className="job-card__save"><span className="btn btn--ghost btn--icon" /></div>
      </article>
    );
  }
}

function LoadedJobCard({ job, selected, onSelect, index = 0, morph = true }: Extract<Props, { job: Job }>) {
  const company = job.company;
  const to = `/jobs/${job.id}`;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Only the clicked card gets the shared names, right before its transition (names must be unique on the page).
  const tagForMorph = () => {
    if (!morph || onSelect) return;
    if (titleRef.current) titleRef.current.style.viewTransitionName = 'job-title';
    if (logoRef.current) logoRef.current.style.viewTransitionName = 'job-logo';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(job.id);
    }
  };

  return (
    <article
      className={`job-card reveal anim-rise${selected ? ' is-selected' : ''}`}
      aria-current={selected ? 'true' : undefined}
      style={{
        '--i': Math.min(index, 8),
        cursor: onSelect ? 'pointer' : undefined,
      } as CSSProperties}
      onClick={handleCardClick}
    >
      <span className="job-card__bar" aria-hidden="true" />
      <CompanyLogo ref={logoRef} name={company?.name ?? '?'} />
      <div className="job-card__body">
        <h3 ref={titleRef} className="job-card__title">
          <TransitionLink
            to={to}
            onBeforeTransition={onSelect ? undefined : tagForMorph}
            onPointerEnter={() => prefetchJob(job.id)}
            onFocus={() => prefetchJob(job.id)}
            onClick={(e) => {
              if (onSelect) {
                e.preventDefault();
                e.stopPropagation();
                onSelect(job.id);
              }
            }}
          >
            {job.title}
          </TransitionLink>
        </h3>
        <div className="job-card__company">{company?.name}</div>
        <div className="job-card__meta">
          <span><Icon name="pin" size={14} />{job.location}</span>
          <span className="job-card__salary"><Icon name="money" size={14} />{formatSalary(job.salary)}</span>
        </div>
        <div className="job-card__footer">
          <span className="tag">{WORK_MODE_LABELS[job.workMode]}</span>
          <span className="tag">{EMPLOYMENT_LABELS[job.employmentType]}</span>
          {job.easyApply && <span className="tag tag--brand"><Icon name="bolt" size={12} />Easy apply</span>}
          {isNew(job.postedAt) && <span className="tag tag--accent">New</span>}
          <AppliedTag jobId={job.id} />
          <SourceNote job={job} compact />
          <span className="job-card__posted">{timeAgo(job.postedAt)}</span>
        </div>
      </div>
      <div className="job-card__save" onClick={(e) => e.stopPropagation()}>
        <SaveButton jobId={job.id} />
      </div>
    </article>
  );
}

/** Skeleton cards for a loading list. `asListItems` wraps each in <li> for use inside <ul>. */
export function JobCardSkeletons({ count = 5, asListItems = true }: { count?: number; asListItems?: boolean }) {
  return (
    <>
      {Array.from({ length: count }, (_, n) => (asListItems ? <li key={n}><JobCard skeleton /></li> : <JobCard key={n} skeleton />))}
    </>
  );
}
