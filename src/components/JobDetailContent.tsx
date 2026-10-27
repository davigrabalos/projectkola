import { Link } from 'react-router-dom';
import type { Job } from '../data/types';
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS, WORK_MODE_LABELS } from '../data/types';
import { formatSalary, timeAgo } from '../lib/format';
import { CompanyLogo } from './CompanyLogo';
import { Icon } from './Icon';
import { SaveButton } from './SaveButton';
import { Sk } from './Skeleton';
import { ApplyAction } from './ApplyAction';
import { SourceNote } from './SourceNote';
import { TransitionLink } from './TransitionLink';

/** Same layout as JobDetailContent with grey blocks, for loading states. */
export function JobDetailSkeleton() {
  return (
    <div className="stack is-skeleton" aria-hidden="true">
      <header className="job-detail__header">
        <div className="job-detail__top">
          <div className="company-logo sk-box" />
          <div style={{ flex: 1 }}>
            <div className="job-detail__title" style={{ fontFamily: 'var(--font-display)' }}><Sk w="75%" /></div>
            <div className="job-detail__company"><Sk w="30%" /></div>
            <p className="subtle"><Sk w="45%" /></p>
          </div>
        </div>
        <div className="job-detail__actions"><span className="btn sk-box" style={{ width: '9rem' }} /><span className="btn sk-box" style={{ width: '6rem' }} /></div>
      </header>
      <dl className="job-facts">
        {[0, 1, 2, 3].map((n) => <div key={n}><dt><Sk w="50%" /></dt><dd><Sk w="70%" /></dd></div>)}
      </dl>
      {[0, 1, 2].map((n) => (
        <section key={n} className="job-detail__section">
          <h2><Sk w="40%" /></h2>
          <p><Sk w="95%" /><br /><Sk w="80%" /><br /><Sk w="60%" /></p>
        </section>
      ))}
    </div>
  );
}

/** Shared between the desktop preview pane and the full job page.
    `descriptionPending`: the job came from a list and its full description is still loading. */
export function JobDetailContent({ job, headingLevel = 1, showOpenLink, descriptionPending = false }: {
  job: Job;
  headingLevel?: 1 | 2;
  showOpenLink?: boolean;
  descriptionPending?: boolean;
}) {
  const company = job.company;
  // Shared names: only the full job page sets viewTransitionName to avoid document-level flash in preview.
  const vtTitle = headingLevel === 1 ? ({ viewTransitionName: 'job-title' } as const) : undefined;
  const vtLogo = headingLevel === 1 ? ({ viewTransitionName: 'job-logo' } as const) : undefined;
  const H = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="stack">
      <header className="job-detail__header">
        <div className="job-detail__top">
          <CompanyLogo name={company?.name ?? '?'} style={vtLogo} />
          <div>
            <H className="job-detail__title" style={vtTitle}>{job.title}</H>
            <Link to={`/companies/${company?.id}`} className="job-detail__company">{company?.name}</Link>
            <p className="subtle">{job.location} · Posted {timeAgo(job.postedAt).toLowerCase()}</p>
          </div>
        </div>
        <div className="job-detail__actions">
          <ApplyAction job={job} />
          <SaveButton jobId={job.id} withLabel />
          {showOpenLink && <TransitionLink to={`/jobs/${job.id}`} className="btn btn--ghost">Open full page<Icon name="arrowRight" size={16} /></TransitionLink>}
        </div>
      </header>

      <dl className="job-facts">
        <div><dt>Salary</dt><dd>{formatSalary(job.salary)}</dd></div>
        <div><dt>Work mode</dt><dd>{WORK_MODE_LABELS[job.workMode]}</dd></div>
        <div><dt>Job type</dt><dd>{EMPLOYMENT_LABELS[job.employmentType]}</dd></div>
        <div><dt>Experience</dt><dd>{EXPERIENCE_LABELS[job.experience]}</dd></div>
      </dl>

      {job.descriptionHtml ? (
        // Sanitised server-side (worker/sanitize.ts): simple text markup only, links open in a new tab.
        <section className="job-detail__section job-description" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
      ) : descriptionPending && job.source && job.source.provider !== 'adzuna' ? (
        <section className="job-detail__section is-skeleton" aria-busy="true" aria-label="Loading the full description">
          <h2>About the role</h2>
          <p><Sk w="95%" /><br /><Sk w="88%" /><br /><Sk w="70%" /></p>
          <p><Sk w="92%" /><br /><Sk w="60%" /></p>
        </section>
      ) : job.summary ? (
        <section className="job-detail__section">
          <h2>About the role</h2>
          <p>{job.summary}</p>
          {job.source && <p className="subtle">The full description is on the original posting.</p>}
        </section>
      ) : null}
      {job.responsibilities.length > 0 && (
        <section className="job-detail__section">
          <h2>What you'll do</h2>
          <ul>{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}
      {job.requirements.length > 0 && (
        <section className="job-detail__section">
          <h2>What we're looking for</h2>
          <ul>{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}
      {job.skills.length > 0 && (
        <section className="job-detail__section">
          <h2>Skills</h2>
          <ul className="tag-list">{job.skills.map((s) => <li key={s} className="tag tag--brand">{s}</li>)}</ul>
        </section>
      )}
      {job.benefits.length > 0 && (
        <section className="job-detail__section">
          <h2>Benefits</h2>
          <ul className="tag-list">{job.benefits.map((b) => <li key={b} className="tag tag--success"><Icon name="check" size={12} />{b}</li>)}</ul>
        </section>
      )}
      <SourceNote job={job} />
    </div>
  );
}
