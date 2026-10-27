import { useSavedJobs } from '../context/SavedJobs';
import { useToast } from '../context/Toast';
import { Icon } from './Icon';

export function SaveButton({ jobId, withLabel }: { jobId: string; withLabel?: boolean }) {
  const { isSaved, save, remove, restore } = useSavedJobs();
  const toast = useToast();
  const saved = isSaved(jobId);

  const onClick = () => {
    if (saved) {
      // Reversible, so no confirm dialog: remove now, offer Undo.
      const index = remove(jobId);
      toast('Removed from saved jobs', { action: { label: 'Undo', onClick: () => restore(jobId, index) } });
    } else {
      save(jobId);
      toast('Saved. Find it any time in Saved jobs');
    }
  };

  return withLabel ? (
    <button className="btn btn--secondary save-btn" aria-pressed={saved} onClick={onClick}>
      <Icon name="bookmark" /> {saved ? 'Saved' : 'Save'}
    </button>
  ) : (
    <button className="btn btn--ghost btn--icon save-btn" aria-pressed={saved} onClick={onClick} aria-label={saved ? 'Remove from saved jobs' : 'Save job'}>
      <Icon name="bookmark" />
    </button>
  );
}
