import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { brand } from '../brand/brand';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { JobCard, JobCardSkeletons } from '../components/JobCard';
import { JobDetailContent, JobDetailSkeleton } from '../components/JobDetailContent';
import { EmptyState } from '../components/EmptyState';
import { Drawer } from '../components/Drawer';
import { SaveButton } from '../components/SaveButton';
import { Icon } from '../components/Icon';
import { useJob, useJobList, useMeta } from '../hooks/useData';
import { ApplyAction } from '../components/ApplyAction';
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS, WORK_MODE_LABELS } from '../data/types';
import { countActiveFilters, parseFilters, serializeFilters, type JobFilters, type SortKey } from '../lib/filters';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth, CAREER_PERSONAS, type CareerType } from '../context/Auth';

const POSTED_LABEL: Record<string, string> = { '1': 'Last 24 hours', '7': 'Last 7 days', '30': 'Last 30 days' };

export default function Jobs() {
  const { user, activePersona, switchCareerType } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const list = useJobList(filters);
  const { jobs: results, total = 0, isLoading, error, retry } = list;
  const { data: meta } = useMeta();
  const showSkeleton = useDelayedFlag(isLoading);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => params.get('job'));
  const isWide = useMediaQuery('(min-width: 1200px)');

  useDocumentTitle(filters.q ? `${filters.q} · Curated deals` : 'Curated deals');

  const selectedId = selectedJobId ?? params.get('job') ?? results[0]?.id;
  const listed = results.find((j) => j.id === selectedId) ?? results[0];
  // The list item renders at once; the full description fills in when it arrives.
  const detail = useJob(listed?.id);
  const selected = listed && detail.data?.id === listed.id ? detail.data : listed;
  const descriptionPending = detail.descriptionPending;

  const update = (patch: Partial<JobFilters>) => {
    const next = serializeFilters({ ...filters, ...patch });
    setParams(next, { replace: false });
  };
  const select = (id: string) => {
    setSelectedJobId(id);
    const next = new URLSearchParams(params);
    next.set('job', id);
    setParams(next, { replace: true });
    if (!isWide) {
      setDetailDrawerOpen(true);
    }
  };
  const clearAll = () => setParams(serializeFilters({ q: filters.q, where: filters.where, sort: filters.sort }));

  // Removable chips for every active filter so users always see (and can undo) what is narrowing results.
  const chips: { label: string; remove: () => void }[] = [
    ...(filters.category ? [{ label: filters.category, remove: () => update({ category: '' }) }] : []),
    ...filters.workMode.map((m) => ({ label: WORK_MODE_LABELS[m], remove: () => update({ workMode: filters.workMode.filter((x) => x !== m) }) })),
    ...filters.type.map((t) => ({ label: EMPLOYMENT_LABELS[t], remove: () => update({ type: filters.type.filter((x) => x !== t) }) })),
    ...filters.level.map((l) => ({ label: EXPERIENCE_LABELS[l], remove: () => update({ level: filters.level.filter((x) => x !== l) }) })),
    ...(filters.posted ? [{ label: POSTED_LABEL[filters.posted], remove: () => update({ posted: '' }) }] : []),
    ...(filters.easyApply ? [{ label: 'Easy apply', remove: () => update({ easyApply: false }) }] : []),
  ];
  const active = countActiveFilters(filters);

  return (
    <>
      <div className="search-header">
        <div className="container">
          <SearchBar initialQ={filters.q} initialWhere={filters.where} onSearch={(q, where) => update({ q, where })} />
        </div>
      </div>

      <div className="container" style={{ paddingTop: 'var(--space-3)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
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
            <strong>Agent Kola Active:</strong>
            <span className="tag tag--brand">{activePersona.badge} Deal Stream</span>
            <span className="subtle">Targeting {user?.targetComp || activePersona.dealRange}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="field__hint">SWITCH TRACK:</span>
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

      <div className={`container results-layout${isWide && (selected || showSkeleton) ? ' results-layout--split' : ''}`}>
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            {active > 0 && <button className="link-btn" onClick={clearAll}>Clear all</button>}
          </div>
          <FilterPanel filters={filters} onChange={update} categories={meta?.categories} showEasyApply={(meta?.easyApply ?? 0) > 0} />
        </aside>

        <section aria-labelledby="results-heading">
          <div className="results-toolbar">
            <button className="btn btn--secondary btn--sm filter-btn-mobile" onClick={() => setDrawerOpen(true)}>
              <Icon name="filter" size={16} />Filters{active > 0 && <span className="count-badge">{active}</span>}
            </button>
            <h1 id="results-heading" className="results-toolbar__count" aria-live="polite">
              {isLoading ? 'Loading jobs…' : <><strong className="mono">{total.toLocaleString('en')}</strong> {total === 1 ? 'job' : 'jobs'}</>}
              {filters.q && <> for <strong>“{filters.q}”</strong></>}
              {filters.where && <> in <strong>{filters.where}</strong></>}
            </h1>
            <label className="results-toolbar__sort">
              <span className="subtle">Sort by</span>
              <select className="select" value={filters.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
                <option value="relevance">Most relevant</option>
                <option value="recent">Most recent</option>
                <option value="salary">Highest salary</option>
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map((c) => (
                <span key={c.label} className="chip">{c.label}
                  <button onClick={c.remove} aria-label={`Remove filter ${c.label}`}><Icon name="close" size={14} /></button>
                </span>
              ))}
              <button className="link-btn" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {error && !list.data ? (
            <EmptyState illustration="connection-lost" title="We couldn't load jobs." hint="Check your connection and try again."
              action={<button className="btn btn--secondary" onClick={retry}>Try again</button>} />
          ) : isLoading ? (
            showSkeleton && <ul className="results-list" aria-busy="true" aria-label="Loading jobs"><JobCardSkeletons count={5} /></ul>
          ) : results.length === 0 ? (
            <EmptyState illustration="searching" title={brand.voice.emptyResults} hint={brand.voice.emptyResultsHint}
              action={<button className="btn btn--secondary" onClick={() => setParams({})}>Reset search</button>} />
          ) : (
            <>
              <ul className="results-list">
                {results.map((j, i) => (
                  <li key={j.id}>
                    <JobCard
                      job={j}
                      index={i % 20}
                      selected={j.id === selected?.id}
                      onSelect={select}
                      morph={false}
                    />
                  </li>
                ))}
              </ul>
              {/* Appending keeps the scroll position; the count says how far through the results you are. */}
              <div className="load-more">
                <p className="subtle" aria-live="polite">Showing {results.length.toLocaleString('en')} of {total.toLocaleString('en')}</p>
                {list.hasMore && (
                  <button className="btn btn--secondary" onClick={list.loadMore} disabled={list.loadingMore} aria-busy={list.loadingMore}>
                    {list.loadingMore ? 'Loading…' : 'Show more jobs'}
                  </button>
                )}
                {list.moreError && <p className="field__error" role="alert">Couldn't load more jobs. Try again.</p>}
              </div>
            </>
          )}
        </section>

        {isWide && showSkeleton && (
          <aside className="job-preview glass" aria-hidden="true"><JobDetailSkeleton /></aside>
        )}
        {isWide && selected && (
          <aside className="job-preview glass" aria-label="Job preview">
            <JobDetailContent job={selected} headingLevel={2} descriptionPending={descriptionPending} />
          </aside>
        )}
      </div>

      <Drawer
        open={!isWide && detailDrawerOpen && Boolean(selected)}
        onClose={() => setDetailDrawerOpen(false)}
        title={selected ? `${selected.title} · Deal Details` : 'Deal Details'}
        footer={
          selected && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
              <SaveButton jobId={selected.id} />
              <ApplyAction job={selected} style={{ flex: 1 }} />
            </div>
          )
        }
      >
        {selected && (
          <div style={{ padding: 'var(--space-2) 0' }}>
            <JobDetailContent job={selected} headingLevel={2} descriptionPending={descriptionPending} />
          </div>
        )}
      </Drawer>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" side="left"
        footer={<>
          <button className="btn btn--secondary" onClick={clearAll}>Clear all</button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setDrawerOpen(false)}>Show {total.toLocaleString('en')} jobs</button>
        </>}>
        <FilterPanel filters={filters} onChange={update} categories={meta?.categories} showEasyApply={(meta?.easyApply ?? 0) > 0} />
      </Drawer>
    </>
  );
}
