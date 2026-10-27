import { forwardRef, type CSSProperties } from 'react';
import { initials } from '../lib/format';

export const CompanyLogo = forwardRef<HTMLDivElement, { name: string; size?: 'lg'; style?: CSSProperties }>(function CompanyLogo({ name, size, style }, ref) {
  return <div ref={ref} className={`company-logo${size === 'lg' ? ' company-logo--lg' : ''}`} style={style} aria-hidden="true">{initials(name)}</div>;
});
