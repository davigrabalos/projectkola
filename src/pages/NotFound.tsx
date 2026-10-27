import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container">
      <EmptyState illustration="the-void" title="We couldn't find that page." hint="It may have moved, or the job may have closed."
        action={<div style={{ display: 'flex', gap: 'var(--space-2)' }}><Link to="/" className="btn btn--secondary">Go home</Link><Link to="/jobs" className="btn btn--primary">Browse jobs</Link></div>} />
    </div>
  );
}
