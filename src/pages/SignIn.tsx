import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Onboarding } from '../components/onboarding/Onboarding';
import { SignInPanel } from '../components/onboarding/SignInPanel';
import '../styles/onboarding.css';

/**
 * Sign-in hub. New people play the onboarding quest (default); returning members
 * get a plain sign-in form. The mode lives in the URL (?mode=login) so it can be linked.
 */
export default function SignIn() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'login' ? 'login' : 'create';
  // Each panel sets its own document title (the quest names the current step).

  const switchTo = (m: 'create' | 'login') => setParams(m === 'login' ? { mode: 'login' } : {}, { replace: true });

  return (
    <div className="quest-page">
      <div className="container">
        <header className="quest-hero">
          <div>
            <span className="eyebrow"><span className="pulse-dot" />Kola agent onboarding</span>
            <h1>{mode === 'login' ? <>Welcome back to <span className="brand-highlight">Kola</span></> : <>Build your <span className="brand-highlight">career agent</span></>}</h1>
            <p>{mode === 'login'
              ? 'Your agent kept scouting while you were away.'
              : 'Seven short levels. Every answer earns XP and sharpens your matches. Progress saves as you go.'}</p>
          </div>
          <div className="mode-switch" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={mode === 'create'} aria-controls="auth-panel" onClick={() => switchTo('create')}>
              <Icon name="sparkles" size={16} />New agent
            </button>
            <button type="button" role="tab" aria-selected={mode === 'login'} aria-controls="auth-panel" onClick={() => switchTo('login')}>
              <Icon name="user" size={16} />Sign in
            </button>
          </div>
        </header>
        <div id="auth-panel" role="tabpanel">
          {mode === 'login' ? <SignInPanel /> : <Onboarding />}
        </div>
      </div>
    </div>
  );
}
