import { useParams } from 'react-router-dom';
import { useCompany } from '../hooks/useData';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CompanyLogo } from '../components/CompanyLogo';
import { JobCard, JobCardSkeletons } from '../components/JobCard';
import { Sk } from '../components/Skeleton';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import NotFound from './NotFound';

export default function CompanyDetail() {
  const { id = '' } = useParams();
  const { data, isLoading } = useCompany(id);
  const company = data?.company;
  const showSkeleton = useDelayedFlag(isLoading);
  useDocumentTitle(company?.name ?? (isLoading ? 'Loading company' : 'Company not found'));
  if (isLoading) {
    return showSkeleton ? (
      <div className="container" style={{ paddingTop: 'var(--space-6)' }} aria-busy="true">
        <div className="company-hero is-skeleton" aria-hidden="true">
          <div className="company-logo company-logo--lg sk-box" />
          <div style={{ flex: 1 }}><h1><Sk w="40%" /></h1><p><Sk w="55%" /></p></div>
        </div>
        <div className="stack"><JobCardSkeletons count={3} asListItems={false} /></div>
      </div>
    ) : null;
  }
  if (!company) return <NotFound />;
  const open = data?.jobs ?? [];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
      <Breadcrumbs items={[{ label: 'Companies', to: '/companies' }, { label: company.name }]} />
      <div className="company-hero">
        <CompanyLogo name={company.name} size="lg" />
        <div style={{ flex: 1 }}>
          <h1>{company.name}</h1>
          <p>{[company.industry, company.size, company.headquarters].filter(Boolean).join(' · ')}</p>
        </div>
        {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="btn btn--secondary">Website<Icon name="external" size={16} /></a>}
      </div>
      <div className="job-detail-page" style={{ paddingTop: 0 }}>
        <section className="stack">
          <span className="eyebrow">Open jobs in Europe and Brazil · {open.length}</span>
          {open.length ? open.map((j, i) => <JobCard key={j.id} job={j} index={i} />) : <EmptyState illustration="out-of-office" title="No open jobs right now." hint="Check back soon." />}
        </section>
        <aside className="card stack reveal">
          <span className="eyebrow">About</span>
          <p>{company.about || 'Kola found this company through a job feed; it is not a curated partner yet.'}</p>
          {company.rating && <p><Icon name="star" size={14} /> {company.rating.toFixed(1)} employee rating</p>}
        </aside>
      </div>
    </div>
  );
}
