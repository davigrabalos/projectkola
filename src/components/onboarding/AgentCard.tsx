import type { CSSProperties } from 'react';
import { Icon } from '../Icon';
import { CAREER_PERSONAS } from '../../context/Auth';
import {
  ACHIEVEMENTS, LEVELS, SENIORITY, STEPS, initials, levelFor, stepIndex, vaultCount,
  type Draft, type XpItem,
} from '../../lib/onboarding';

export interface XpGain { id: number; amount: number }

/** Profile strength as XP, with rank ticks and floating "+XP" gains. */
export function XpBar({ xp, gains, compact }: { xp: number; gains: XpGain[]; compact?: boolean }) {
  const level = levelFor(xp);
  return (
    <div className={`xp${compact ? ' xp--compact' : ''}`} style={{ '--xp': xp } as CSSProperties}>
      <div className="xp__row">
        <span className="xp__rank"><Icon name="trophy" size={14} />{level.name}</span>
        <span className="xp__value"><strong className="num">{xp}</strong><span>/100 XP</span></span>
      </div>
      <div className="xp__track">
      <div className="xp__bar" role="progressbar" aria-label="Profile strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xp} aria-valuetext={`${xp} of 100 XP, rank ${level.name}`}>
        <div className="xp__fill" style={{ transform: `scaleX(${xp / 100})` }} />
        {LEVELS.slice(1).map((l) => <span key={l.min} className={`xp__tick${xp >= l.min ? ' is-passed' : ''}`} style={{ left: `${l.min}%` }} title={l.name} />)}
      </div>
      {/* Gains rise from the end of the fill, so they never cover the numbers. */}
      <div className="xp__gains" aria-hidden="true">
        {gains.map((g) => <span key={g.id} className="xp__gain">+{g.amount} XP</span>)}
      </div>
      </div>
      {!compact && <div className="xp__next">{level.next ? `${level.next.min - xp} XP to ${level.next.name}` : 'Top rank reached'}</div>}
    </div>
  );
}

/** A short burst around the avatar when the rank goes up. Purely decorative. */
function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ '--a': `${i * 30}deg` } as CSSProperties} />)}
    </span>
  );
}

interface Props {
  draft: Draft;
  xp: number;
  items: XpItem[];
  gains: XpGain[];
  levelUpKey: number;
  onJump: (index: number) => void;
}

/** The live "character sheet": fills in as the quest is played. */
export function AgentCard({ draft, xp, items, gains, levelUpKey, onJump }: Props) {
  const persona = draft.careerType ? CAREER_PERSONAS[draft.careerType] : null;
  const level = levelFor(xp);
  const seniority = SENIORITY.find((s) => s.id === draft.seniority);
  const next = items.filter((i) => !i.done).sort((a, b) => b.points - a.points)[0];
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(draft)).length;

  return (
    <aside className="agent-sheet glass" aria-label="Your agent card">
      <div className="agent-sheet__head">
        <span className={`agent-sheet__avatar${levelUpKey ? ' is-up' : ''}`} key={levelUpKey}>
          {initials(draft.name) || <Icon name="user" size={22} />}
          {levelUpKey > 0 && <Burst />}
        </span>
        <div className="agent-sheet__who">
          <strong>{draft.name.trim() || 'Your agent'}</strong>
          <span>{draft.title.trim() || (persona ? persona.tagline : 'Headline appears here')}</span>
        </div>
        <span className="agent-sheet__lv" title={`Rank ${level.name}`}>Lv {level.index + 1}</span>
      </div>

      <XpBar xp={xp} gains={gains} />

      <dl className="agent-sheet__stats">
        <div><dt>Track</dt><dd>{persona ? persona.badge : '–'}</dd></div>
        <div><dt>Level</dt><dd>{seniority ? seniority.label : '–'}</dd></div>
        <div><dt>Roles</dt><dd className="num">{draft.roles.length}</dd></div>
        <div><dt>Vault</dt><dd className="num">{vaultCount(draft)}/4</dd></div>
      </dl>

      {draft.skills.length > 0 && (
        <ul className="tag-list agent-sheet__skills" aria-label="Skills">
          {draft.skills.slice(0, 8).map((s) => <li key={s} className="tag tag--brand">{s}</li>)}
          {draft.skills.length > 8 && <li className="tag">+{draft.skills.length - 8}</li>}
        </ul>
      )}

      <div>
        <div className="agent-sheet__label">Badges <span className="num">{unlocked}/{ACHIEVEMENTS.length}</span></div>
        <ul className="badges">
          {ACHIEVEMENTS.map((a) => {
            const on = a.test(draft);
            return (
              <li key={a.id} className={`badge${on ? ' is-on' : ''}`} title={on ? a.label : `Locked: ${a.hint}`}>
                <span className="badge__icon"><Icon name={on ? a.icon : 'lock'} size={on ? 16 : 13} /></span>
                <span className="badge__label">{a.label}</span>
                <span className="visually-hidden">{on ? 'unlocked' : `locked. ${a.hint}`}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {next ? (
        <button type="button" className="next-move" onClick={() => onJump(stepIndex(next.step))}>
          <span className="next-move__label">Next best move</span>
          <span className="next-move__body">{next.label}<span className="xp-tag">+{next.points} XP</span></span>
          <span className="next-move__step">{STEPS[stepIndex(next.step)].label}<Icon name="arrowRight" size={14} /></span>
        </button>
      ) : (
        <p className="next-move is-complete"><Icon name="trophy" size={16} /> Profile complete. Every point claimed.</p>
      )}
    </aside>
  );
}
