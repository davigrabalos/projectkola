import { Link } from 'react-router-dom';
import { brand } from '../brand/brand';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <Logo />
            <p className="subtle" style={{ marginTop: 'var(--space-3)' }}>{brand.tagline}</p>
          </div>
          <nav aria-label="Job seekers">
            <h2>Job seekers</h2>
            <ul>
              <li><Link to="/jobs">Browse jobs</Link></li>
              <li><Link to="/companies">Companies</Link></li>
              <li><Link to="/saved">Saved jobs</Link></li>
              <li><Link to="/jobs?mode=remote">Remote jobs</Link></li>
            </ul>
          </nav>
          <nav aria-label="Employers">
            <h2>Employers</h2>
            <ul>
              <li><Link to="/employers">Post a job</Link></li>
              <li><Link to="/employers">Pricing</Link></li>
            </ul>
          </nav>
          <nav aria-label={`About ${brand.name}`}>
            <h2>{brand.name}</h2>
            <ul>
              <li><a href={`mailto:${brand.contact.email}`}>Contact</a></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} {brand.name} &lt;/&gt; All rights reserved.</span>
          <span style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {brand.social.map((s) => <a key={s.label} href={s.href}>{s.label}</a>)}
          </span>
        </div>
      </div>
    </footer>
  );
}
