import { Link, useParams } from 'react-router-dom';
import { useCompany, useJob, useJobList } from '../hooks/useData';
import { ApplyAction } from '../components/ApplyAction';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { JobDetailContent, JobDetailSkeleton } from '../components/JobDetailContent';
import { Sk } from '../components/Skeleton';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { JobCard } from '../components/JobCard';
import { CompanyLogo } from '../components/CompanyLogo';
import { SaveButton } from '../components/SaveButton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import NotFound from './NotFound';

export default function JobDetail() {
  const { id = '' } = useParams();
  const { data: job, isLoading, descriptionPending } = useJob(id);
  const { data: companyData } = useCompany(job?.companyId ?? '');
  const company = companyData?.company;
  // Similar jobs: newest in the same category (the API returns at most 4; this job is filtered out).
  const { jobs: sameCategory } = useJobList({ category: job?.category ?? '', sort: 'recent' }, 4, Boolean(job));
  const showSkeleton = useDelayedFlag(isLoading);
  useDocumentTitle(job ? `${job.title} at ${job.company?.name ?? company?.name ?? ''}` : isLoading ? 'Loading job' : 'Job not found');
  if (isLoading) {
    return showSkeleton ? (
      <div className="container" style={{ paddingTop: 'var(--space-6)' }} aria-busy="true">
        <div className="breadcrumbs"><ol><li><Sk w="12rem" /></li></ol></div>
        <div className="job-detail-page">
          <div className="card"><JobDetailSkeleton /></div>
          <aside className="card stack is-skeleton" aria-hidden="true"><p><Sk w="60%" /><br /><Sk w="90%" /><br /><Sk w="80%" /></p></aside>
        </div>
      </div>
    ) : null;
  }
  if (!job) return <NotFound />;

  const similar = sameCategory.filter((j) => j.id !== job.id).slice(0, 3);

  return (
    <>
      <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
        <Breadcrumbs items={[{ label: 'Jobs', to: '/jobs' }, { label: job.category, to: `/jobs?category=${encodeURIComponent(job.category)}` }, { label: job.title }]} />
        <div className="job-detail-page">
          <article className="card reveal"><JobDetailContent job={job} descriptionPending={descriptionPending} /></article>
          <aside className="stack">
            {company && (
              <div className="card stack reveal">
                <div className="company-card__top">
                  <CompanyLogo name={company.name} />
                  <div><strong>{company.name}</strong><div className="subtle">{[company.industry, company.headquarters].filter(Boolean).join(' · ')}</div></div>
                </div>
                {company.about && <p>{company.about}</p>}
                <Link to={`/companies/${company.id}`} className="btn btn--secondary btn--block">View company</Link>
              </div>
            )}
            {similar.length > 0 && (
              <div className="stack">
                <span className="eyebrow">Similar jobs</span>
                {similar.map((j, i) => <JobCard key={j.id} job={j} index={i} morph={false} />)}
              </div>
            )}
          </aside>
        </div>
      </div>
      <div className="apply-bar glass glass--strong">
        <SaveButton jobId={job.id} />
        <ApplyAction job={job} style={{ flex: 1 }} />
      </div>
    </>
  );
}
