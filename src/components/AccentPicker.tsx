import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { ACCENT_PRESETS, accentVars, DEFAULT_ACCENT, normalizeHex, presetFor } from '../lib/accent';
import { Icon } from './Icon';

interface Props {
  /** Selected seed colour (hex). */
  value: string | undefined;
  /** A colour was chosen: a preset click, or the custom colour dialog closed with a new colour. */
  onChange: (hex: string) => void;
  /** Live updates while dragging inside the custom colour dialog. Not a commitment. */
  onPreview?: (hex: string) => void;
  label?: string;
  hint?: string;
  /** Smaller swatches, for menus. */
  compact?: boolean;
}

/** Swatches show the exact shade each theme will use, not the raw seed. */
const swatchStyle = (hex: string) => {
  const v = accentVars(hex);
  return { '--sw-d': v['--accent-d'], '--sw-l': v['--accent-l'] } as CSSProperties;
};

/**
 * Favourite-colour picker: a radio group of presets plus a custom colour.
 * Native radios give arrow-key navigation and screen reader support for free;
 * the selected swatch also shows a check mark, so the choice never relies on colour alone.
 */
export function AccentPicker({ value, onChange, onPreview, label = 'Accent colour', hint, compact }: Props) {
  const name = useId();
  const current = normalizeHex(value) ?? DEFAULT_ACCENT;
  const preset = presetFor(current);
  const customRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // The custom input is uncontrolled: React would otherwise reset it on every drag step.
  // Keep it in sync when the value changes from outside.
  useEffect(() => {
    if (customRef.current) customRef.current.value = current.toLowerCase();
  }, [current]);

  // The native "change" event fires once, when the colour dialog closes with a new colour.
  useEffect(() => {
    const el = customRef.current;
    if (!el) return;
    const commit = () => onChangeRef.current(el.value);
    el.addEventListener('change', commit);
    return () => el.removeEventListener('change', commit);
  }, []);

  return (
    <fieldset className={`accent-picker${compact ? ' accent-picker--compact' : ''}`}>
      <legend className="field__label">
        {label} <span className="accent-picker__name">· {preset ? preset.label : `Custom ${current}`}</span>
      </legend>
      {hint && <p className="field__hint accent-picker__hint">{hint}</p>}
      <div className="accent-picker__swatches">
        {ACCENT_PRESETS.map((p) => {
          const selected = preset?.id === p.id;
          return (
            <label key={p.id} className={`accent-swatch${selected ? ' is-selected' : ''}`} style={swatchStyle(p.hex)} title={p.label}>
              <input
                className="accent-swatch__input"
                type="radio"
                name={name}
                value={p.hex}
                checked={selected}
                onChange={() => onChange(p.hex)}
              />
              <span className="accent-swatch__dot" aria-hidden="true">
                {selected && <Icon name="check" size={compact ? 12 : 14} />}
              </span>
              <span className="visually-hidden">{p.label}</span>
            </label>
          );
        })}
        <label
          className={`accent-swatch accent-swatch--custom${preset ? '' : ' is-selected'}`}
          style={preset ? undefined : swatchStyle(current)}
          title="Pick any colour"
        >
          <input
            ref={customRef}
            className="accent-swatch__input"
            type="color"
            defaultValue={current.toLowerCase()}
            aria-label="Custom colour"
            onInput={(e) => onPreview?.(e.currentTarget.value)}
            // Dialog dismissed without choosing: show the selected colour again.
            onBlur={() => onPreview?.(current)}
          />
          <span className="accent-swatch__dot" aria-hidden="true">
            {!preset && <Icon name="check" size={compact ? 12 : 14} />}
          </span>
        </label>
      </div>
    </fieldset>
  );
}
