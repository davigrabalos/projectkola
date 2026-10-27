import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../data/types';
import { useToast } from '../context/Toast';
import { markApplied, useAppliedAt } from '../lib/applied';
import { Icon } from './Icon';

const PROVIDER_SITE: Record<string, string> = { adzuna: 'Adzuna' };

/**
 * The apply button. Real jobs open the employer's application (or Adzuna's, as its terms require) in a new tab;
 * when the user returns, Kola asks whether they applied and remembers the answer. Jobs with easy apply
 * (mock data) keep the in-app form.
 */
export function ApplyAction({ job, style, className = 'btn btn--primary' }: { job: Job; style?: CSSProperties; className?: string }) {
  const showToast = useToast();
  const appliedAt = useAppliedAt(job.id);

  if (!job.applyUrl) {
    return (
      <Link to={`/jobs/${job.id}/apply`} className={className} style={style}>
        {job.easyApply ? <><Icon name="bolt" />Easy apply</> : <>Apply now<Icon name="external" size={16} /></>}
      </Link>
    );
  }

  const site = PROVIDER_SITE[job.source?.provider ?? ''] ?? `${job.company?.name ?? 'the company'}'s site`;
  const askOnReturn = () => {
    if (appliedAt) return;
    const ask = () => showToast(`Did you apply to ${job.title}?`, {
      action: { label: 'Yes, mark applied', onClick: () => markApplied(job.id) },
      duration: 10000,
    });
    window.addEventListener('focus', ask, { once: true });
  };

  return (
    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className={className} style={style} onClick={askOnReturn}>
      {appliedAt ? <><Icon name="check" />Applied · open again</> : <>Apply on {site}<Icon name="external" size={16} /></>}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

/** "Applied" tag for cards. */
export function AppliedTag({ jobId }: { jobId: string }) {
  const appliedAt = useAppliedAt(jobId);
  return appliedAt ? <span className="tag tag--success"><Icon name="check" size={12} />Applied</span> : null;
}
