import { Icon } from '../Icon';
import { CAREER_PERSONAS, type CareerType } from '../../context/Auth';
import { FieldError, type StepProps } from './shared';

/** "Choose your class": one radio card per career track. */
export function TrackStep({ draft, set, errors }: StepProps) {
  return (
    <fieldset className="choice-fieldset" aria-describedby={errors.careerType ? 'err-track' : undefined}>
      <legend className="visually-hidden">Career track</legend>
      <div className="track-grid">
        {(Object.keys(CAREER_PERSONAS) as CareerType[]).map((t) => {
          const p = CAREER_PERSONAS[t];
          const on = draft.careerType === t;
          return (
            <label key={t} className={`choice-card track-card${on ? ' is-on' : ''}`}>
              <input className="choice-card__input" type="radio" name="careerType" value={t} checked={on} onChange={() => set({ careerType: t })} />
              <span className="track-card__top">
                <span className="track-card__icon"><Icon name={p.icon} size={20} /></span>
                <span className="choice-card__check" aria-hidden="true"><Icon name="check" size={14} /></span>
              </span>
              <span className="track-card__label">{p.label}</span>
              <span className="track-card__desc">{p.tagline}</span>
              <span className="track-card__skills" aria-hidden="true">{p.defaultSkills.slice(0, 3).join(' · ')}</span>
              <span className="track-card__comp">{p.dealRange}</span>
            </label>
          );
        })}
      </div>
      <FieldError id="err-track" msg={errors.careerType} />
    </fieldset>
  );
}
