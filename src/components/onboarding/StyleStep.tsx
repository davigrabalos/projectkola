import { AccentPicker } from '../AccentPicker';
import { Icon } from '../Icon';
import { DEFAULT_ACCENT, normalizeHex } from '../../lib/accent';
import type { StepProps } from './shared';

interface Props extends StepProps {
  onPreview: (hex: string | null) => void;
}

/** Signature colour. The whole page re-tints live; the small card shows it on real UI parts. */
export function StyleStep({ draft, set, onPreview }: Props) {
  const pick = (hex: string) => {
    set({ accentColor: normalizeHex(hex) });
    onPreview(hex);
  };
  return (
    <div className="style-step">
      <AccentPicker
        label="Signature colour"
        hint="Used for buttons, links and highlights. Status colours, like errors and success, never change."
        value={draft.accentColor ?? DEFAULT_ACCENT}
        onChange={pick}
        onPreview={onPreview}
      />
      <div className="style-preview" aria-hidden="true">
        <span className="eyebrow">Preview</span>
        <div className="style-preview__card">
          <span className="company-logo">KO</span>
          <div>
            <strong>Staff Product Engineer</strong>
            <span className="subtle">Kola Labs · Remote</span>
            <div className="tag-list"><span className="tag tag--brand"><Icon name="bolt" size={12} />Easy apply</span><span className="tag tag--accent">New</span></div>
          </div>
        </div>
        <div className="style-preview__row">
          <span className="btn btn--primary btn--sm">Apply now</span>
          <span className="btn btn--secondary btn--sm">Save</span>
          <span className="style-preview__link">View company</span>
        </div>
      </div>
    </div>
  );
}
