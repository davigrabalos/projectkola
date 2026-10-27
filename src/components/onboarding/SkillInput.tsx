import { useState, type KeyboardEvent } from 'react';
import { Icon } from '../Icon';
import { MAX_SKILLS } from '../../lib/onboarding';

interface Props {
  skills: string[];
  suggestions: string[];
  /** Receives an updater, so several quick additions never overwrite each other. */
  onChange: (update: (skills: string[]) => string[]) => void;
}

/** Chip input: Enter or comma adds, Backspace on an empty field removes the last chip. */
export function SkillInput({ skills, suggestions, onChange }: Props) {
  const [text, setText] = useState('');
  const full = skills.length >= MAX_SKILLS;
  const add = (raw: string) => {
    const s = raw.trim().replace(/,$/, '').trim();
    if (!s) return;
    onChange((prev) => (prev.length >= MAX_SKILLS || prev.some((x) => x.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s.slice(0, 40)]));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Enter would otherwise submit the step
      add(text);
      setText('');
    } else if (e.key === 'Backspace' && !text && skills.length) {
      onChange((prev) => prev.slice(0, -1));
    }
  };
  return (
    <div className="skill-input">
      <div className="skill-input__box">
        {skills.map((s) => (
          <span key={s} className="chip">{s}
            <button type="button" onClick={() => onChange((prev) => prev.filter((x) => x !== s))} aria-label={`Remove ${s}`}><Icon name="close" size={14} /></button>
          </span>
        ))}
        <input id="ob-skills" className="skill-input__field" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
          onBlur={() => { add(text); setText(''); }} disabled={full}
          placeholder={full ? 'Skill slots full' : skills.length ? 'Add another…' : 'Type a skill and press Enter'} aria-describedby="hint-skills" />
      </div>
      <span id="hint-skills" className="field__hint"><span className="num">{skills.length}/{MAX_SKILLS}</span> skill slots used</span>
      {!full && suggestions.length > 0 && (
        <div className="suggest" aria-label="Suggested skills">
          {suggestions.map((s) => (
            <button key={s} type="button" className="suggest__chip" onClick={() => add(s)}><Icon name="plus" size={12} />{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
