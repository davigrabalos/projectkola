import { Link } from 'react-router-dom';
import { brand } from '../brand/brand';
import { useSavedJobs } from '../context/SavedJobs';
import { useJobsByIds } from '../hooks/useData';
import { JobCard, JobCardSkeletons } from '../components/JobCard';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { EmptyState } from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Saved() {
  useDocumentTitle('Saved jobs');
  const { saved } = useSavedJobs();
  const { data: found, isLoading } = useJobsByIds(saved);
  const showSkeleton = useDelayedFlag(isLoading);
  // Keep the saved order; jobs that have closed since are not returned.
  const list = saved.flatMap((id) => found?.find((j) => j.id === id) ?? []);
  const closed = found ? saved.length - list.length : 0;

  return (
    <div className="container">
      <div className="page-head">
        <span className="eyebrow">Shortlist</span>
        <h1>Saved jobs</h1>
        <p>{saved.length ? `${saved.length} saved ${saved.length === 1 ? 'job' : 'jobs'}` : 'Your shortlist lives here.'}</p>
      </div>
      {isLoading && saved.length > 0 ? (
        showSkeleton && <ul className="results-list" style={{ maxWidth: 760 }} aria-busy="true" aria-label="Loading saved jobs"><JobCardSkeletons count={Math.min(saved.length, 6)} /></ul>
      ) : list.length === 0 ? (
        <EmptyState illustration="bookmarks" title={brand.voice.emptySaved} hint={brand.voice.emptySavedHint}
          action={<Link to="/jobs" className="btn btn--primary">Browse jobs</Link>} />
      ) : (
        <>
          <ul className="results-list" style={{ maxWidth: 760 }}>
            {list.map((j, i) => <li key={j.id}><JobCard job={j} index={i} /></li>)}
          </ul>
          {closed > 0 && <p className="subtle" style={{ marginTop: 'var(--space-4)' }}>{closed} saved {closed === 1 ? 'job has' : 'jobs have'} closed since you saved {closed === 1 ? 'it' : 'them'}.</p>}
        </>
      )}
    </div>
  );
}
