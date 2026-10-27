import { Icon } from '../Icon';
import { STEPS } from '../../lib/onboarding';

interface Props {
  current: number;
  maxReached: number;
  completed: boolean[];
  onJump: (index: number) => void;
}

/**
 * The quest map: every step as a node on one track. Visited steps can be revisited
 * in any order; steps not reached yet stay locked so the flow keeps its order.
 */
export function QuestMap({ current, maxReached, completed, onJump }: Props) {
  const progress = current / (STEPS.length - 1);
  return (
    <nav className="quest-map" aria-label="Profile steps">
      <div className="quest-map__track" aria-hidden="true">
        <div className="quest-map__fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <ol>
        {STEPS.map((s, i) => {
          const state = i === current ? 'current' : completed[i] ? 'done' : i <= maxReached ? 'open' : 'locked';
          return (
            <li key={s.id} className={`quest-node is-${state}`}>
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={i > maxReached}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Step ${i + 1}, ${s.label}${state === 'done' ? ', done' : state === 'locked' ? ', locked' : ''}`}
              >
                <span className="quest-node__dot">
                  <Icon name={state === 'done' ? 'check' : state === 'locked' ? 'lock' : s.icon} size={state === 'locked' ? 13 : 15} />
                </span>
                <span className="quest-node__label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
