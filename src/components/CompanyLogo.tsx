import { forwardRef, useState, type CSSProperties } from 'react';
import { initials } from '../lib/format';
import { logos } from '../data/logos';

/** The company's own logo mark on a white tile (public/logos/, see npm run mock:logos); initials when there is none or it fails to load. */
export const CompanyLogo = forwardRef<HTMLDivElement, { id?: string; name: string; size?: 'lg'; style?: CSSProperties }>(function CompanyLogo({ id, name, size, style }, ref) {
  const src = id ? logos[id] : undefined;
  const [failed, setFailed] = useState<string>();
  const show = src && failed !== src;
  return (
    <div ref={ref} className={`company-logo${size === 'lg' ? ' company-logo--lg' : ''}${show ? ' company-logo--img' : ''}`} style={style} aria-hidden="true">
      {show ? <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(src)} /> : initials(name)}
    </div>
  );
});
