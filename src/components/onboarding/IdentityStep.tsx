import { useState } from 'react';
import { Icon } from '../Icon';
import { isEmail, passwordStrength } from '../../lib/onboarding';
import { FieldError, XpTag, type StepProps } from './shared';

interface Props extends StepProps {
  password: string;
  setPassword: (p: string) => void;
  /** True when a saved draft was restored: the password is never saved, so it must be typed again. */
  passwordForgotten: boolean;
}

export function IdentityStep({ draft, set, errors, password, setPassword, passwordForgotten }: Props) {
  const [show, setShow] = useState(false);
  const strength = passwordStrength(password);
  return (
    <div className="form-grid">
      <label className="field">
        <span className="field__label">Full name <XpTag points={5} done={draft.name.trim().length >= 2} /></span>
        <input className="input" name="name" autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Alex Chen" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} />
        <FieldError id="err-name" msg={errors.name} />
      </label>
      <label className="field">
        <span className="field__label">Email <XpTag points={5} done={isEmail(draft.email)} /></span>
        <input className="input" name="email" type="email" inputMode="email" autoComplete="email" value={draft.email}
          onChange={(e) => set({ email: e.target.value })} placeholder="you@example.com"
          aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email' : 'hint-email'} />
        {errors.email ? <FieldError id="err-email" msg={errors.email} /> : <span id="hint-email" className="field__hint">Deals and interview invites arrive here. No spam.</span>}
      </label>
      <div className="field">
        <label className="field__label" htmlFor="ob-password">Password</label>
        <div className="input-affix">
          <input id="ob-password" className="input" name="new-password" type={show ? 'text' : 'password'} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} minLength={8}
            aria-invalid={!!errors.password} aria-describedby={errors.password ? 'err-password' : 'hint-password'} />
          <button type="button" className="input-affix__btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
          </button>
        </div>
        <div className={`strength strength--${strength.score}`} aria-hidden="true"><span /><span /><span /><span /></div>
        {errors.password ? <FieldError id="err-password" msg={errors.password} /> : (
          <span id="hint-password" className="field__hint">
            {passwordForgotten && !password ? 'Welcome back. For your safety, passwords are never saved with your progress, so please type it again.'
              : strength.label ? `${strength.label} password` : 'At least 8 characters. A short sentence works well.'}
          </span>
        )}
      </div>
    </div>
  );
}
