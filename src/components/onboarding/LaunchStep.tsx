import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import { CAREER_PERSONAS } from '../../context/Auth';
import { presetFor } from '../../lib/accent';
import {
  SENIORITY, STEPS, WORK_STYLES, formatComp, normalizeGithub, normalizeLinkedIn, normalizeUrl, stepIndex,
  type StepId, type XpItem,
} from '../../lib/onboarding';
import { FieldError, type StepProps } from './shared';

interface Props extends StepProps {
  items: XpItem[];
  onJump: (index: number) => void;
}

const missing = <span className="review__missing">Not added</span>;

export function LaunchStep({ draft, set, errors, items, onJump }: Props) {
  const persona = draft.careerType ? CAREER_PERSONAS[draft.careerType] : null;
  const open = items.filter((i) => !i.done);
  const Section = ({ step, children }: { step: StepId; children: ReactNode }) => (
    <section className="review__section">
      <header>
        <h3>{STEPS[stepIndex(step)].label}</h3>
        <button type="button" className="link-btn" onClick={() => onJump(stepIndex(step))}>Edit<span className="visually-hidden"> {STEPS[stepIndex(step)].label}</span></button>
      </header>
      <dl>{children}</dl>
    </section>
  );
  const Row = ({ k, v }: { k: string; v: ReactNode }) => <div><dt>{k}</dt><dd>{v || missing}</dd></div>;

  return (
    <div className="form-grid">
      <div className="review">
        <Section step="identity"><Row k="Name" v={draft.name} /><Row k="Email" v={draft.email} /></Section>
        <Section step="track"><Row k="Track" v={persona?.label} /></Section>
        <Section step="background">
          <Row k="Headline" v={draft.title} />
          <Row k="Level" v={SENIORITY.find((s) => s.id === draft.seniority)?.label} />
          <Row k="Roles" v={draft.roles.length ? draft.roles.map((r) => `${r.title} · ${r.company}`).join(', ') : ''} />
          <Row k="Skills" v={draft.skills.join(', ')} />
        </Section>
        <Section step="preferences">
          <Row k="Work style" v={WORK_STYLES.find((w) => w.id === draft.workMode)?.label} />
          <Row k="Pay" v={<span className="num">{formatComp(draft)}</span>} />
          <Row k="Power-ups" v={draft.priorities.join(', ')} />
        </Section>
        <Section step="vault">
          <Row k="CV" v={draft.cv?.name} />
          <Row k="LinkedIn" v={normalizeLinkedIn(draft.linkedin)?.replace('https://www.', '')} />
          <Row k="GitHub" v={normalizeGithub(draft.github)?.replace('https://', '')} />
          <Row k="Portfolio" v={normalizeUrl(draft.portfolio)?.replace(/^https:\/\/|\/$/g, '')} />
        </Section>
        <Section step="style">
          <Row k="Colour" v={draft.accentColor ? <span className="review__swatch"><span style={{ background: 'var(--color-brand)' }} />{presetFor(draft.accentColor)?.label ?? draft.accentColor}</span> : 'Kola cyan (default)'} />
        </Section>
      </div>

      {open.length > 0 && (
        <div className="unclaimed">
          <span className="unclaimed__title"><Icon name="trophy" size={16} />{open.reduce((s, i) => s + i.points, 0)} XP still unclaimed</span>
          <ul>
            {open.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => onJump(stepIndex(i.step))}>{i.label}<span className="xp-tag">+{i.points} XP</span></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="check consent">
        <input type="checkbox" checked={draft.agreed} onChange={(e) => set({ agreed: e.target.checked })}
          aria-invalid={!!errors.agreed} aria-describedby={errors.agreed ? 'err-agreed' : undefined} />
        <span>I agree to the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>, and let my agent share my profile with matching hiring partners.</span>
      </label>
      <FieldError id="err-agreed" msg={errors.agreed} />
    </div>
  );
}
