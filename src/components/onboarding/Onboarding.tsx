import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Icon, type IconName } from '../Icon';
import { Illustration, preloadIllustration, type IllustrationName } from '../Illustration';
import { useAuth } from '../../context/Auth';
import { useToast } from '../../context/Toast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { base, fast } from '../../lib/motion';
import {
  ACHIEVEMENTS, STEPS, clearDraft, draftFromUser, draftToProfile, emptyDraft, hasErrors, levelFor, loadDraft,
  saveDraft, stepIndex, validateStep, xpForStep, xpItems, xpOf, type Draft, type Errors,
} from '../../lib/onboarding';
import { AgentCard, XpBar, type XpGain } from './AgentCard';
import { QuestMap } from './QuestMap';

/** One illustration per level, shown beside the step title. */
const STEP_ART: Record<(typeof STEPS)[number]['id'], IllustrationName> = {
  identity: 'online-profile',
  track: 'career-growth',
  background: 'stepping-up',
  preferences: 'personal-goals',
  vault: 'my-resume',
  style: 'painting-the-room',
  launch: 'launch-event',
};
import { IdentityStep } from './IdentityStep';
import { TrackStep } from './TrackStep';
import { BackgroundStep } from './BackgroundStep';
import { PreferencesStep } from './PreferencesStep';
import { VaultStep } from './VaultStep';
import { StyleStep } from './StyleStep';
import { LaunchStep } from './LaunchStep';
import { LaunchOverlay } from './LaunchOverlay';

interface Unlock { id: number; kind: 'badge' | 'rank'; title: string; icon: IconName }

/** Direction-aware slide between steps. Reduced motion keeps only the fade (MotionConfig). */
const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0, transition: base },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: fast }),
};

export function Onboarding() {
  const { user, loginWithCustom, previewAccent } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [params, setParams] = useSearchParams();

  // Resume a saved draft; otherwise edit a real profile; otherwise start fresh.
  const restored = useRef(loadDraft());
  const [draft, setDraft] = useState<Draft>(() => restored.current ?? (user && !user.id.startsWith('demo-') ? draftFromUser(user) : emptyDraft()));
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [launching, setLaunching] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = useCallback((patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
    setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) })), []);

  /* ---------- Step routing: the step lives in the URL, so Back/Forward move between steps ---------- */
  const urlIndex = stepIndex(params.get('step'));
  const current = Math.min(urlIndex >= 0 ? urlIndex : draft.current, draft.maxReached);
  const step = STEPS[current];
  // Warm the next level's illustration so it is ready when the player moves on.
  useEffect(() => { const n = STEPS[current + 1]; if (n) preloadIllustration(STEP_ART[n.id]); }, [current]);
  const prevStep = useRef(current);
  const dir = current >= prevStep.current ? 1 : -1;

  const goTo = useCallback((i: number) => {
    setErrors({});
    setDraft((d) => ({ ...d, current: i }));
    setParams((p) => { const n = new URLSearchParams(p); n.set('step', STEPS[i].id); return n; });
  }, [setParams]);

  useDocumentTitle(`Create your agent · ${step.label}`);

  /* ---------- XP, ranks, badges ---------- */
  const items = useMemo(() => xpItems(draft), [draft]);
  const xp = xpOf(items);
  const level = levelFor(xp);
  const [gains, setGains] = useState<XpGain[]>([]);
  const [cheer, setCheer] = useState(0); // bumps on every XP gain; the level's illustration pops
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [levelUpKey, setLevelUpKey] = useState(0);
  const prevXp = useRef(xp);
  const prevLevel = useRef(level.index);
  const prevBadges = useRef(new Set(ACHIEVEMENTS.filter((a) => a.test(draft)).map((a) => a.id)));

  const pushUnlock = useCallback((u: Omit<Unlock, 'id'>) => {
    const id = Date.now() + Math.random();
    setUnlocks((list) => [...list.slice(-2), { ...u, id }]);
    window.setTimeout(() => setUnlocks((list) => list.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    if (xp > prevXp.current) {
      const g = { id: Date.now() + Math.random(), amount: xp - prevXp.current };
      setGains((list) => [...list.slice(-2), g]);
      setCheer((c) => c + 1);
      window.setTimeout(() => setGains((list) => list.filter((x) => x.id !== g.id)), 1400);
    }
    prevXp.current = xp;
    if (level.index > prevLevel.current) {
      setLevelUpKey((k) => k + 1);
      pushUnlock({ kind: 'rank', title: `Rank up: ${level.name}`, icon: 'trophy' });
    }
    prevLevel.current = level.index;
    for (const a of ACHIEVEMENTS) {
      const on = a.test(draft);
      if (on && !prevBadges.current.has(a.id)) pushUnlock({ kind: 'badge', title: `Badge unlocked: ${a.label}`, icon: a.icon });
      if (on) prevBadges.current.add(a.id); else prevBadges.current.delete(a.id);
    }
  }, [draft, xp, level.index, level.name, pushUnlock]);

  /* ---------- Draft autosave (never the password or file contents) ---------- */
  const launched = useRef(false);
  useEffect(() => {
    if (launched.current) return;
    const t = window.setTimeout(() => { saveDraft(draft); setSaved(true); }, 300);
    return () => window.clearTimeout(t);
  }, [draft]);

  /* ---------- Accent: show the chosen colour while on this page, restore on leave ---------- */
  useEffect(() => {
    if (restored.current?.accentColor) previewAccent(restored.current.accentColor);
    return () => previewAccent(null);
  }, [previewAccent]);

  /* ---------- Focus: move to the new step's heading so keyboard and screen reader users follow ---------- */
  const heading = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    if (prevStep.current === current) return;
    prevStep.current = current;
    heading.current?.focus({ preventScroll: true });
    const top = card.current?.getBoundingClientRect().top ?? 0;
    if (top < 80) window.scrollBy({ top: top - 96, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current]);

  /* ---------- Navigation ---------- */
  /** Shows errors and focuses the first problem. `afterSwap` waits for a step change to finish animating. */
  const showErrors = (errs: Errors, afterSwap = false) => {
    setErrors(errs);
    window.setTimeout(() => {
      card.current?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[aria-describedby] input')?.focus();
    }, afterSwap ? 280 : 0);
  };

  const launch = () => {
    for (let i = 0; i < STEPS.length; i++) {
      const errs = validateStep(STEPS[i].id, draft, { password, checkPassword: true });
      if (hasErrors(errs)) {
        if (i !== current) {
          goTo(i);
          showToast(`Finish “${STEPS[i].label}” to launch your agent.`);
        }
        showErrors(errs, i !== current);
        return;
      }
    }
    setLaunching(true);
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step.id === 'launch') return launch();
    const errs = validateStep(step.id, draft, { password, checkPassword: step.id === 'identity' });
    if (hasErrors(errs)) return showErrors(errs);
    // Continuing past deal terms accepts the pay range shown, which claims its XP.
    set({ maxReached: Math.max(draft.maxReached, current + 1), ...(step.id === 'preferences' ? { compSet: true } : {}) });
    goTo(current + 1);
  };

  const skip = () => {
    set({ maxReached: Math.max(draft.maxReached, current + 1) });
    goTo(current + 1);
  };

  const finishLaunch = () => {
    launched.current = true;
    loginWithCustom(draftToProfile(draft, xp));
    clearDraft();
    showToast(`Your agent is live, ${draft.name.trim().split(/\s+/)[0]}. Here are your first deals.`);
    navigate('/jobs');
  };

  const startOver = () => {
    const snapshot = draft;
    setDraft(emptyDraft());
    setPassword('');
    previewAccent(null);
    goTo(0);
    showToast('Started a fresh profile.', {
      action: { label: 'Undo', onClick: () => { setDraft(snapshot); if (snapshot.accentColor) previewAccent(snapshot.accentColor); } },
    });
  };

  const completed = STEPS.map((s, i) => i < draft.maxReached && s.id !== 'launch' && !hasErrors(validateStep(s.id, draft)));
  const stepXp = xpForStep(items, step.id);
  const stepEarned = items.filter((i) => i.step === step.id && i.done).reduce((s, i) => s + i.points, 0);
  const props = { draft, set, errors };

  return (
    <>
      <div className="quest-layout">
        <div className="quest-main">
          <QuestMap current={current} maxReached={draft.maxReached} completed={completed} onJump={goTo} />

          <form ref={card} className="quest-card glass" onSubmit={next} noValidate aria-labelledby="quest-step-title">
            <div className="quest-card__head">
              <div>
                <span className="eyebrow">Level {current + 1} of {STEPS.length}{'optional' in step ? ' · Optional' : ''}</span>
                <h2 id="quest-step-title" ref={heading} tabIndex={-1}>{step.title}</h2>
                <p>{step.quest}</p>
              </div>
              <div className="quest-card__side">
                {stepXp > 0 && (
                  <div className={`loot${stepEarned === stepXp ? ' is-full' : ''}`} title="XP earned in this step">
                    <Icon name={stepEarned === stepXp ? 'check' : 'star'} size={16} />
                    <span className="num">{stepEarned}/{stepXp}</span><span>XP</span>
                  </div>
                )}
                <Illustration name={STEP_ART[step.id]} className="quest-card__art" preset="step" cheer={cheer} />
              </div>
            </div>
            <div className="quest-card__xp"><XpBar xp={xp} gains={[]} compact /></div>

            <div className="quest-card__body">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <m.div key={step.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                  {step.id === 'identity' && <IdentityStep {...props} password={password} setPassword={setPassword} passwordForgotten={!!restored.current} />}
                  {step.id === 'track' && <TrackStep {...props} />}
                  {step.id === 'background' && <BackgroundStep {...props} />}
                  {step.id === 'preferences' && <PreferencesStep {...props} />}
                  {step.id === 'vault' && <VaultStep {...props} />}
                  {step.id === 'style' && <StyleStep {...props} onPreview={previewAccent} />}
                  {step.id === 'launch' && <LaunchStep {...props} items={items} onJump={goTo} />}
                </m.div>
              </AnimatePresence>
            </div>

            <div className="quest-card__foot">
              {current > 0
                ? <button type="button" className="btn btn--ghost" onClick={() => goTo(current - 1)}><Icon name="arrowLeft" size={16} />Back</button>
                : <span />}
              <div className="quest-card__actions">
                {'optional' in step && <button type="button" className="btn btn--ghost" onClick={skip}>Skip for now</button>}
                {step.id === 'launch'
                  ? <button type="submit" className="btn btn--primary btn--lg"><Icon name="rocket" size={18} />Launch my agent</button>
                  : <button type="submit" className="btn btn--primary">Continue<Icon name="arrowRight" size={16} /></button>}
              </div>
            </div>
          </form>

          <div className="quest-meta">
            <span className="quest-meta__saved" aria-live="polite">{saved && <><Icon name="check" size={14} />Progress saved on this device</>}</span>
            <button type="button" className="link-btn" onClick={startOver}>Start over</button>
          </div>
        </div>

        <AgentCard draft={draft} xp={xp} items={items} gains={gains} levelUpKey={levelUpKey} onJump={goTo} />
      </div>

      <div className="unlock-stack" aria-live="polite">
        {unlocks.map((u) => (
          <div key={u.id} className={`unlock unlock--${u.kind}`}>
            <span className="unlock__icon"><Icon name={u.icon} size={18} /></span>
            <span>{u.title}</span>
          </div>
        ))}
      </div>

      {launching && <LaunchOverlay roles={draft.roles.length} skills={draft.skills.length} onDone={finishLaunch} />}
    </>
  );
}
