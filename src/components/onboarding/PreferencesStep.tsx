import type { CSSProperties } from 'react';
import { Icon } from '../Icon';
import { COMP_RANGE, CURRENCIES, MAX_POWER_UPS, POWER_UPS, WORK_STYLES, formatK, type Currency } from '../../lib/onboarding';
import { FieldError, XpTag, type StepProps } from './shared';

/** 0-1 position of a value on the slider, used to draw the filled part between the thumbs. */
const frac = (n: number) => (n - COMP_RANGE.min) / (COMP_RANGE.max - COMP_RANGE.min);

export function PreferencesStep({ draft, set, errors }: StepProps) {
  const full = draft.priorities.length >= MAX_POWER_UPS;
  const setMin = (v: number) => set((d) => ({ compMin: Math.min(v, d.compMax - COMP_RANGE.gap), compSet: true }));
  const setMax = (v: number) => set((d) => ({ compMax: Math.max(v, d.compMin + COMP_RANGE.gap), compSet: true }));
  const toggle = (p: string) =>
    set((d) => ({
      priorities: d.priorities.includes(p) ? d.priorities.filter((x) => x !== p)
        : d.priorities.length >= MAX_POWER_UPS ? d.priorities : [...d.priorities, p],
    }));

  return (
    <div className="form-grid">
      <fieldset className="choice-fieldset" aria-describedby={errors.workMode ? 'err-workmode' : undefined}>
        <legend className="field__label">How do you want to work? <XpTag points={5} done={!!draft.workMode} /></legend>
        <div className="segmented-cards">
          {WORK_STYLES.map((w) => (
            <label key={w.id} className={`choice-card mode-card${draft.workMode === w.id ? ' is-on' : ''}`}>
              <input className="choice-card__input" type="radio" name="workMode" checked={draft.workMode === w.id} onChange={() => set({ workMode: w.id })} />
              <Icon name={w.icon} size={22} />
              <span className="mode-card__label">{w.label}</span>
              <span className="mode-card__hint">{w.hint}</span>
            </label>
          ))}
        </div>
        <FieldError id="err-workmode" msg={errors.workMode} />
        <label className="switch">
          <input type="checkbox" role="switch" checked={draft.relocate} onChange={(e) => set({ relocate: e.target.checked })} />
          <span className="switch__track" aria-hidden="true"><span /></span>
          Open to relocating for the right deal
        </label>
      </fieldset>

      <fieldset className="choice-fieldset">
        <legend className="field__label">Target pay per year <XpTag points={5} done={draft.compSet} /></legend>
        <div className="comp">
          <div className="comp__readout">
            <output className="comp__value num" aria-live="polite">{formatK(draft.compMin, draft.currency)} – {formatK(draft.compMax, draft.currency)}</output>
            <select className="select comp__currency" aria-label="Currency" value={draft.currency} onChange={(e) => set({ currency: e.target.value as Currency, compSet: true })}>
              {CURRENCIES.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>
          <div className="range2" style={{ '--lo': frac(draft.compMin), '--hi': frac(draft.compMax) } as CSSProperties}>
            <span className="range2__fill" aria-hidden="true" />
            <input type="range" aria-label="Minimum pay" min={COMP_RANGE.min} max={COMP_RANGE.max} step={COMP_RANGE.step} value={draft.compMin}
              aria-valuetext={formatK(draft.compMin, draft.currency)} onChange={(e) => setMin(Number(e.target.value))} />
            <input type="range" aria-label="Maximum pay" min={COMP_RANGE.min} max={COMP_RANGE.max} step={COMP_RANGE.step} value={draft.compMax}
              aria-valuetext={formatK(draft.compMax, draft.currency)} onChange={(e) => setMax(Number(e.target.value))} />
          </div>
          <div className="comp__scale" aria-hidden="true"><span>{formatK(COMP_RANGE.min, draft.currency)}</span><span>{formatK(COMP_RANGE.max, draft.currency)}+</span></div>
        </div>
      </fieldset>

      <fieldset className="choice-fieldset">
        <legend className="field__label">
          Pick up to {MAX_POWER_UPS} power-ups <XpTag points={5} done={draft.priorities.length > 0} />
          <span className="powerups__count num">{draft.priorities.length}/{MAX_POWER_UPS}</span>
        </legend>
        <p className="field__hint">Your agent puts these first when it compares deals.</p>
        <div className="powerups">
          {POWER_UPS.map((p) => {
            const on = draft.priorities.includes(p);
            return (
              <button key={p} type="button" className={`powerup${on ? ' is-on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(p)}>
                <Icon name={on ? 'check' : 'bolt'} size={14} />{p}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
