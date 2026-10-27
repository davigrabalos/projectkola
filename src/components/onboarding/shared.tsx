import type { Draft, Errors } from '../../lib/onboarding';

/** What every quest step receives. */
export interface StepProps {
  draft: Draft;
  /** Merge a patch, or derive one from the latest draft (safe for rapid repeated input). */
  set: (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  errors: Errors;
}

/** Inline error, linked to its field with aria-describedby. */
export function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <span id={id} className="field__error">{msg}</span> : null;
}

/** XP a field is worth, shown next to its label so people see what each answer earns. */
export function XpTag({ points, done }: { points: number; done: boolean }) {
  return (
    <span className={`xp-tag${done ? ' is-done' : ''}`} aria-label={done ? `${points} XP earned` : `Worth ${points} XP`}>
      {done ? '✓ ' : '+'}{points} XP
    </span>
  );
}
