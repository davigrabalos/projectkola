import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanies } from '../hooks/useData';
import { CompanyLogo } from '../components/CompanyLogo';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { Sk } from '../components/Skeleton';

export default function Companies() {
  useDocumentTitle('Companies');
  const [q, setQ] = useState('');
  const { data: companies = [], isLoading } = useCompanies();
  const showSkeleton = useDelayedFlag(isLoading);
  const list = companies.filter((c) => (c.name + c.industry).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container">
      <div className="page-head">
        <span className="eyebrow">{isLoading ? 'Companies hiring' : `${companies.length} companies hiring`}</span>
        <h1>Explore companies</h1>
        <p>Learn about teams before you apply.</p>
      </div>
      <label className="company-search">
        <span className="visually-hidden">Search companies</span>
        <Icon name="search" />
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or industry" />
      </label>
      {isLoading ? (
        showSkeleton && (
          <div className="company-grid" aria-busy="true" aria-label="Loading companies">
            {Array.from({ length: 6 }, (_, n) => (
              <div key={n} className="card company-card is-skeleton" aria-hidden="true">
                <div className="company-card__top">
                  <div className="company-logo sk-box" />
                  <div style={{ flex: 1 }}><strong><Sk w="55%" /></strong><div className="subtle"><Sk w="80%" /></div></div>
                </div>
                <p style={{ fontSize: 'var(--text-sm)' }}><Sk w="95%" /><br /><Sk w="90%" /><br /><Sk w="50%" /></p>
                <div><span className="tag sk-tag"><Sk w="5rem" /></span></div>
              </div>
            ))}
          </div>
        )
      ) : list.length === 0 ? <EmptyState illustration="searching-everywhere" title="No companies match that search." /> : (
        <div className="company-grid">
          {list.map((c) => {
            const open = c.openJobs ?? 0;
            return (
              <Link key={c.id} to={`/companies/${c.id}`} className="card company-card reveal">
                <div className="company-card__top">
                  <CompanyLogo name={c.name} />
                  <div>
                    <strong>{c.name}</strong>
                    <div className="subtle">{c.industry} · {c.headquarters}</div>
                  </div>
                </div>
                <p style={{ fontSize: 'var(--text-sm)' }}>{c.about}</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <span className="tag tag--brand">{open} open {open === 1 ? 'job' : 'jobs'}</span>
                  {c.rating && <span className="tag"><Icon name="star" size={12} />{c.rating.toFixed(1)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
