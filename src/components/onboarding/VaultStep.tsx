import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Icon, type IconName } from '../Icon';
import { MAX_SKILLS, formatSize, normalizeGithub, normalizeLinkedIn, normalizeUrl, skillsFromFile, type Draft } from '../../lib/onboarding';
import { FieldError, XpTag, type StepProps } from './shared';

const ACCEPT = ['.pdf', '.doc', '.docx'];
const MAX_BYTES = 5 * 1024 * 1024;

function Slot({ icon, label, filled }: { icon: IconName; label: string; filled: boolean }) {
  return (
    <li className={`slot${filled ? ' is-filled' : ''}`}>
      <span className="slot__icon"><Icon name={filled ? icon : 'plus'} size={18} /></span>
      <span className="slot__label">{label}</span>
      <span className="visually-hidden">{filled ? 'archived' : 'empty'}</span>
    </li>
  );
}

interface LinkFieldProps {
  id: 'linkedin' | 'github' | 'portfolio';
  label: string;
  icon: IconName;
  placeholder: string;
  points: number;
  normalize: (s: string) => string | null;
  draft: Draft;
  set: StepProps['set'];
  error?: string;
}

/** A link slot: validates as you type, tidies the address when you leave the field. */
function LinkField({ id, label, icon, placeholder, points, normalize, draft, set, error }: LinkFieldProps) {
  const value = draft[id];
  const ok = !!normalize(value);
  return (
    <label className="field">
      <span className="field__label">{label} {points > 0 && <XpTag points={points} done={ok} />}</span>
      <span className={`link-field${ok ? ' is-ok' : ''}`}>
        <Icon name={icon} size={18} />
        <input className="input" type="url" inputMode="url" autoComplete="url" spellCheck={false} placeholder={placeholder} value={value}
          onChange={(e) => set({ [id]: e.target.value } as Partial<Draft>)}
          onBlur={() => { const n = normalize(value); if (n) set({ [id]: n } as Partial<Draft>); }}
          aria-invalid={!!error} aria-describedby={error ? `err-${id}` : undefined} />
        {ok && <span className="link-field__ok"><Icon name="check" size={14} />Linked</span>}
      </span>
      <FieldError id={`err-${id}`} msg={error} />
    </label>
  );
}

export function VaultStep({ draft, set, errors }: StepProps) {
  const [dragging, setDragging] = useState(false);
  const [scan, setScan] = useState<number | null>(null); // 0-100 while "reading" the CV
  const [fileError, setFileError] = useState('');
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const take = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.includes(ext)) return setFileError('That file type is not supported. Use a PDF or Word document.');
    if (file.size > MAX_BYTES) return setFileError(`That file is ${formatSize(file.size)}. The limit is 5 MB.`);
    setFileError('');
    const finish = () => set({ cv: { name: file.name, size: file.size, foundSkills: skillsFromFile(file.name, draft) } });
    // Demo "parsing" pass: a short scan so the archive feels like it reads the file. Instant with reduced motion.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    window.clearInterval(timer.current);
    let progress = 0;
    setScan(0);
    timer.current = window.setInterval(() => {
      progress += 8;
      if (progress < 100) return setScan(progress);
      window.clearInterval(timer.current);
      setScan(null);
      finish();
    }, 70);
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files[0]); };
  const found = (draft.cv?.foundSkills ?? []).filter((s) => !draft.skills.some((x) => x.toLowerCase() === s.toLowerCase()));
  const addFound = () => set((d) => ({ skills: [...d.skills, ...found.filter((s) => !d.skills.includes(s))].slice(0, MAX_SKILLS) }));

  return (
    <div className="form-grid">
      <ul className="slots" aria-label="Vault slots">
        <Slot icon="fileText" label="CV" filled={!!draft.cv} />
        <Slot icon="linkedin" label="LinkedIn" filled={!!normalizeLinkedIn(draft.linkedin)} />
        <Slot icon="github" label="GitHub" filled={!!normalizeGithub(draft.github)} />
        <Slot icon="globe" label="Portfolio" filled={!!normalizeUrl(draft.portfolio)} />
      </ul>

      <div className="field">
        <span className="field__label" id="cv-label">CV or résumé <XpTag points={15} done={!!draft.cv} /></span>
        {draft.cv && scan === null ? (
          <div className="file-card">
            <span className="file-card__icon"><Icon name="fileText" size={22} /></span>
            <div className="file-card__body">
              <strong>{draft.cv.name}</strong>
              <span>{draft.cv.size ? `${formatSize(draft.cv.size)} · ` : ''}Archived</span>
            </div>
            <label className="btn btn--ghost btn--sm">
              Replace<input className="visually-hidden" type="file" accept={ACCEPT.join(',')} onChange={(e) => take(e.target.files?.[0])} />
            </label>
            <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => set({ cv: null })} aria-label="Remove CV"><Icon name="trash" size={16} /></button>
          </div>
        ) : (
          <label className={`dropzone${dragging ? ' is-dragging' : ''}${scan !== null ? ' is-scanning' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <input className="visually-hidden" type="file" accept={ACCEPT.join(',')} aria-labelledby="cv-label" aria-describedby="cv-hint"
              onChange={(e) => take(e.target.files?.[0])} disabled={scan !== null} />
            {scan !== null ? (
              <>
                <span className="dropzone__scan" aria-hidden="true" />
                <strong>Reading your CV…</strong>
                <span className="dropzone__progress" role="progressbar" aria-label="Reading CV" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scan}>
                  <span style={{ transform: `scaleX(${scan / 100})` }} />
                </span>
              </>
            ) : (
              <>
                <span className="dropzone__icon"><Icon name="upload" size={26} /></span>
                <strong>Drop your CV here, or <span className="dropzone__browse">browse</span></strong>
                <span id="cv-hint" className="field__hint">PDF or Word, up to 5 MB.</span>
              </>
            )}
          </label>
        )}
        {fileError && <span className="field__error" role="alert">{fileError}</span>}
        {draft.cv && scan === null && found.length > 0 && (
          <div className="found">
            <span className="found__title"><Icon name="sparkles" size={14} />Your agent found {found.length} skills in your CV</span>
            <div className="tag-list">{found.map((s) => <span key={s} className="tag tag--brand">{s}</span>)}</div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addFound} disabled={draft.skills.length >= MAX_SKILLS}>
              <Icon name="plus" size={14} />Add them to your skills
            </button>
          </div>
        )}
      </div>

      <LinkField id="linkedin" label="LinkedIn profile" icon="linkedin" placeholder="linkedin.com/in/your-name" points={10}
        normalize={normalizeLinkedIn} draft={draft} set={set} error={errors.linkedin} />
      <div className="form-grid form-grid--2">
        <LinkField id="github" label="GitHub" icon="github" placeholder="github.com/your-name" points={0}
          normalize={normalizeGithub} draft={draft} set={set} error={errors.github} />
        <LinkField id="portfolio" label="Portfolio or website" icon="globe" placeholder="yoursite.com" points={0}
          normalize={normalizeUrl} draft={draft} set={set} error={errors.portfolio} />
      </div>
      <p className="field__hint vault-note"><Icon name="shield" size={14} />GitHub or a portfolio earns +5 XP. In this demo only the file name is kept; nothing is uploaded.</p>
    </div>
  );
}
