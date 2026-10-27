import { Link } from 'react-router-dom';
import { brand } from '../brand/brand';
import { LOGO_CHEVRONS, LOGO_LETTERS, LOGO_VIEWBOX } from '../brand/logo-paths';

/** The Kola wordmark. Inherits text colour; the < > chevrons turn accent on hover. */
export function Wordmark({ title = brand.name }: { title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} role="img" aria-label={title}>
      <path d={LOGO_LETTERS} fill="currentColor" />
      <path d={LOGO_CHEVRONS} className="logo__chevrons" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${brand.name} home`}>
      <Wordmark title={brand.name} />
    </Link>
  );
}
