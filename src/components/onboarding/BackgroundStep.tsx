import { useState, type KeyboardEvent } from 'react';
import { Icon } from '../Icon';
import { DEMO_PROFILES } from '../../context/Auth';
import { COMP_DEFAULTS, SENIORITY, skillSuggestions, type Seniority } from '../../lib/onboarding';
import { uuid } from '../../lib/uuid';
import { FieldError, XpTag, type StepProps } from './shared';
import { SkillInput } from './SkillInput';

const YEAR = new Date().getFullYear();
const emptyRole = { title: '', company: '', start: '', end: '', current: false };

export function BackgroundStep({ draft, set, errors }: StepProps) {
  const [role, setRole] = useState(emptyRole);
  const [roleError, setRoleError] = useState('');
  const placeholder = draft.careerType ? DEMO_PROFILES[draft.careerType].title : 'Senior Product Designer';

  const pickSeniority = (s: Seniority) => {
    // Until someone touches the pay sliders, keep them at a realistic range for the level.
    const [compMin, compMax] = COMP_DEFAULTS[s];
    set(draft.compSet ? { seniority: s } : { seniority: s, compMin, compMax });
  };

  const addRole = () => {
    const start = Number(role.start);
    const end = Number(role.end);
    if (!role.title.trim() || !role.company.trim()) return setRoleError('Add a job title and a company.');
    if (!/^\d{4}$/.test(role.start) || start < 1960 || start > YEAR) return setRoleError(`Start year must be between 1960 and ${YEAR}.`);
    if (!role.current && (!/^\d{4}$/.test(role.end) || end < start || end > YEAR)) return setRoleError('End year must be after the start year, or tick “I work here now”.');
    setRoleError('');
    const entry = { id: uuid(), ...role, title: role.title.trim(), company: role.company.trim() };
    set((d) => ({ roles: [...d.roles, entry].sort((a, b) => Number(b.start) - Number(a.start)) }));
    setRole(emptyRole);
    document.getElementById('ob-role-title')?.focus();
  };
  // Enter inside the role fields adds the role instead of submitting the step.
  const onRoleKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } };

  return (
    <div className="form-grid">
      <label className="field">
        <span className="field__label">Headline <XpTag points={5} done={draft.title.trim().length >= 2} /></span>
        <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder={`e.g. ${placeholder}`}
          autoComplete="organization-title" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'err-title' : undefined} maxLength={80} />
        <FieldError id="err-title" msg={errors.title} />
      </label>

      <fieldset className="choice-fieldset" aria-describedby={errors.seniority ? 'err-seniority' : undefined}>
        <legend className="field__label">Experience level <XpTag points={5} done={!!draft.seniority} /></legend>
        <div className="segmented-cards">
          {SENIORITY.map((s, i) => (
            <label key={s.id} className={`choice-card level-card${draft.seniority === s.id ? ' is-on' : ''}`}>
              <input className="choice-card__input" type="radio" name="seniority" checked={draft.seniority === s.id} onChange={() => pickSeniority(s.id)} />
              <span className="level-card__pips" aria-hidden="true">{SENIORITY.map((_, j) => <span key={j} className={j <= i ? 'is-on' : ''} />)}</span>
              <span className="level-card__label">{s.label}</span>
              <span className="level-card__years">{s.years}</span>
            </label>
          ))}
        </div>
        <FieldError id="err-seniority" msg={errors.seniority} />
      </fieldset>

      <div className="field">
        <span className="field__label">Career timeline <XpTag points={10} done={draft.roles.length > 0} /></span>
        {draft.roles.length > 0 && (
          <ol className="timeline">
            {draft.roles.map((r) => (
              <li key={r.id} className="timeline__item">
                <span className="timeline__dot" aria-hidden="true" />
                <div className="timeline__body">
                  <strong>{r.title}</strong>
                  <span>{r.company} · <span className="num">{r.start} – {r.current ? 'Present' : r.end}</span></span>
                </div>
                <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => set((d) => ({ roles: d.roles.filter((x) => x.id !== r.id) }))} aria-label={`Remove ${r.title} at ${r.company}`}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="role-form" role="group" aria-label="Add a role">
          <div className="role-form__grid">
            <input id="ob-role-title" className="input" placeholder="Job title" aria-label="Job title" value={role.title} onChange={(e) => setRole({ ...role, title: e.target.value })} onKeyDown={onRoleKey} />
            <input className="input" placeholder="Company" aria-label="Company" value={role.company} onChange={(e) => setRole({ ...role, company: e.target.value })} onKeyDown={onRoleKey} />
            <input className="input" inputMode="numeric" placeholder="Start year" aria-label="Start year" maxLength={4} value={role.start} onChange={(e) => setRole({ ...role, start: e.target.value.replace(/\D/g, '') })} onKeyDown={onRoleKey} />
            <input className="input" inputMode="numeric" placeholder={role.current ? 'Present' : 'End year'} aria-label="End year" maxLength={4} disabled={role.current} value={role.current ? '' : role.end} onChange={(e) => setRole({ ...role, end: e.target.value.replace(/\D/g, '') })} onKeyDown={onRoleKey} />
          </div>
          <div className="role-form__foot">
            <label className="check"><input type="checkbox" checked={role.current} onChange={(e) => setRole({ ...role, current: e.target.checked })} />I work here now</label>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addRole}><Icon name="plus" size={16} />Add role</button>
          </div>
          {roleError && <span className="field__error" role="alert">{roleError}</span>}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="ob-skills">Skills <XpTag points={5} done={draft.skills.length >= 3} /> <XpTag points={5} done={draft.skills.length >= 6} /></label>
        <SkillInput skills={draft.skills} suggestions={skillSuggestions(draft)} onChange={(update) => set((d) => ({ skills: update(d.skills) }))} />
      </div>
    </div>
  );
}
