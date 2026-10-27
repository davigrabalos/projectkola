import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { CAREER_PERSONAS, DEMO_PROFILES, useAuth, type CareerType } from '../../context/Auth';
import { useToast } from '../../context/Toast';
import { isEmail } from '../../lib/onboarding';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FieldError } from './shared';

const nameFromEmail = (email: string) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || 'Kola member';

/** Returning members: a plain, fast sign-in. The quest is only for new profiles. */
export function SignInPanel() {
  const { user, loginWithCustom, loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Sign in');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isEmail(email)) errs.email = 'Enter the email you signed up with.';
    if (password.length < 8) errs.password = 'Passwords are at least 8 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    // TODO(api): POST /session. Demo: the saved profile signs back in; any other email gets a starter profile.
    window.setTimeout(() => {
      if (!user || user.email.toLowerCase() !== email.trim().toLowerCase()) {
        loginWithCustom({ name: nameFromEmail(email), email: email.trim(), careerType: user?.careerType ?? 'engineering' });
      }
      showToast('Welcome back. Your agent picked up where it left off.');
      navigate('/jobs');
    }, 600);
  };

  const demo = (t: CareerType) => {
    loginWithDemo(t);
    showToast(`Signed in as ${DEMO_PROFILES[t].name}, a demo ${CAREER_PERSONAS[t].badge} profile.`);
    navigate('/jobs');
  };

  return (
    <div className="signin">
      <form className="signin__card glass" onSubmit={submit} noValidate aria-labelledby="signin-title">
        <h2 id="signin-title">Welcome back</h2>
        <p>Sign in to see the deals your agent found while you were away.</p>
        <label className="field">
          <span className="field__label">Email</span>
          <input className="input" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-si-email' : undefined} />
          <FieldError id="err-si-email" msg={errors.email} />
        </label>
        <div className="field">
          <div className="signin__pw-label">
            <label className="field__label" htmlFor="si-password">Password</label>
            <button type="button" className="link-btn" onClick={() => showToast(isEmail(email) ? `If ${email.trim()} has an account, a reset link is on its way.` : 'Enter your email first, then ask for a reset link.')}>Forgot password?</button>
          </div>
          <div className="input-affix">
            <input id="si-password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'err-si-password' : undefined} />
            <button type="button" className="input-affix__btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
              <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          <FieldError id="err-si-password" msg={errors.password} />
        </div>
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="signin__switch">New to Kola? <Link to="/sign-in">Create your agent</Link>. It takes about three minutes.</p>
      </form>

      <section className="signin__demos" aria-labelledby="demo-title">
        <span className="eyebrow" id="demo-title">Try a demo agent</span>
        <p>Explore Kola with a ready-made profile. Nothing to fill in.</p>
        <ul>
          {(Object.keys(DEMO_PROFILES) as CareerType[]).map((t) => {
            const d = DEMO_PROFILES[t];
            return (
              <li key={t}>
                <button type="button" className="demo-agent" onClick={() => demo(t)}>
                  <span className="demo-agent__avatar">{d.avatarInitials}</span>
                  <span className="demo-agent__who"><strong>{d.name}</strong><span>{d.title}</span></span>
                  <span className="tag">{CAREER_PERSONAS[t].badge}</span>
                  <Icon name="arrowRight" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
