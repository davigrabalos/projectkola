import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';

interface Props { roles: number; skills: number; onDone: () => void }

/** Launch sequence after the last step: a short, honest checklist, then the deals page. */
export function LaunchOverlay({ roles, skills, onDone }: Props) {
  const [done, setDone] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const lines = [
    'Locking your vault',
    `Reading ${roles} ${roles === 1 ? 'role' : 'roles'} and ${skills} ${skills === 1 ? 'skill' : 'skills'}`,
    'Matching against 2,400 hiring partners',
    'Agent online',
  ];

  useEffect(() => {
    dialog.current?.focus();
    const step = matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 520;
    const timers = lines.map((_, i) => window.setTimeout(() => setDone(i + 1), step * (i + 1)));
    timers.push(window.setTimeout(() => onDoneRef.current(), step * (lines.length + 1)));
    return () => timers.forEach(window.clearTimeout);
    // Runs once per launch; onDone is read through a ref.
  }, []);

  return (
    <div className="launch-overlay">
      <div className="launch-card glass glass--strong" role="dialog" aria-modal="true" aria-labelledby="launch-title" tabIndex={-1} ref={dialog}>
        <span className={`launch-card__rocket${done === lines.length ? ' is-off' : ''}`} aria-hidden="true"><Icon name="rocket" size={30} /></span>
        <h2 id="launch-title">Launching your agent</h2>
        <ol className="launch-card__list" aria-live="polite">
          {lines.map((l, i) => (
            <li key={l} className={i < done ? 'is-done' : i === done ? 'is-active' : ''}>
              <span className="launch-card__mark"><Icon name={i < done ? 'check' : 'clock'} size={14} /></span>{l}
            </li>
          ))}
        </ol>
        <div className="launch-card__bar" aria-hidden="true"><span style={{ transform: `scaleX(${done / lines.length})` }} /></div>
      </div>
    </div>
  );
}
