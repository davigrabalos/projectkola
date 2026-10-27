import type { Job } from '../data/types';
import { Icon } from './Icon';

const NAMES: Record<string, string> = { greenhouse: 'Greenhouse', lever: 'Lever' };

/**
 * Where a real job comes from. Adzuna jobs must carry a "Jobs by Adzuna" label (at least 116 x 23 px)
 * linking back to Adzuna (developer terms). Board jobs link to the original posting.
 */
export function SourceNote({ job, compact = false }: { job: Job; compact?: boolean }) {
  const s = job.source;
  if (!s) return null;
  if (s.provider === 'adzuna') {
    return (
      <a className="adzuna-label" href="https://www.adzuna.com" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        Jobs by <strong>Adzuna</strong>
      </a>
    );
  }
  if (compact) return null;
  return (
    <p className="source-note">
      From {job.company?.name}'s {NAMES[s.provider] ?? 'careers'} board ·{' '}
      <a href={s.url} target="_blank" rel="noopener noreferrer">Original posting<Icon name="external" size={12} /></a>
    </p>
  );
}
