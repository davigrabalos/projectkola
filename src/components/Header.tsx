import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from './Logo';
import { Icon, type IconName } from './Icon';
import { AccentPicker } from './AccentPicker';
import { brand } from '../brand/brand';
import { useSavedJobs } from '../context/SavedJobs';
import { useAuth, CAREER_PERSONAS, type CareerType } from '../context/Auth';
import { useTheme } from '../context/Theme';
import { useToast } from '../context/Toast';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/jobs', label: 'Curated Deals', icon: 'briefcase' },
  { to: '/companies', label: 'Companies', icon: 'building' },
  { to: '/saved', label: 'Saved Deals', icon: 'bookmark' },
];

/** Floating island navigation (see "Floating island" in components.css). */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const { saved } = useSavedJobs();
  const { user, isAuthenticated, activePersona, switchCareerType, logout, setAccentColor, previewAccent } = useAuth();
  const { theme, toggle } = useTheme();
  const showToast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  // Condense once the page scrolls: an observer on a sentinel, so there is no scroll listener.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The menu closes on navigation, outside clicks and Escape (focus goes back to its button).
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSwitchType = (type: CareerType) => {
    switchCareerType(type);
    setMenuOpen(false);
    showToast(`Switched agent profile to ${CAREER_PERSONAS[type].label}!`);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    showToast('Signed out of AI Agent profile.');
    navigate('/sign-in');
  };

  return (
    <>
      {/* Outside the fixed header so it scrolls with the page. */}
      <span ref={sentinelRef} className="island-sentinel" aria-hidden="true" />
      <header className="site-header">
        <div ref={islandRef} className={`island glass glass--strong${compact ? ' is-compact' : ''}${menuOpen ? ' is-open' : ''}`}>
          <Link to="/" className="island__home logo" aria-label={`${brand.name} home`}>
            <Wordmark title={brand.name} />
          </Link>
          <span className="island__sep" aria-hidden="true" />

          <nav aria-label="Main">
            <ul className="island__group">
              {NAV.map((n) => (
                <li key={n.to} className="dock-slot">
                  <NavLink to={n.to} className="dock-item" title={n.label}>
                    <span className="dock-item__icon">
                      <Icon name={n.icon} />
                      {n.to === '/saved' && saved.length > 0 && (
                        <span className="dock-item__badge" aria-label={`${saved.length} saved`}>{saved.length}</span>
                      )}
                    </span>
                    <span className="dock-item__label"><span>{n.label}</span></span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <span className="island__sep" aria-hidden="true" />
          <div className="island__group">
            <div className="dock-slot">
              <button type="button" className="dock-item theme-toggle" onClick={toggle} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
                <span className="dock-item__icon"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></span>
              </button>
            </div>

            <div className="dock-slot">
              {isAuthenticated && user ? (
                <button
                  ref={triggerRef}
                  type="button"
                  className="dock-item dock-item--agent agent-pill"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                  aria-controls="agent-menu"
                  aria-label={`Agent profile menu, ${user.name}`}
                >
                  <span className="dock-item__icon"><span className="dock-item__avatar">{user.avatarInitials}</span></span>
                  <span className="dock-item__label"><span>{user.name.split(' ')[0]}</span></span>
                  <span className="dock-item__label"><span><Icon name="chevronDown" size={14} /></span></span>
                </button>
              ) : (
                <Link to="/sign-in" className="dock-item dock-item--cta" title="Activate Agent">
                  <span className="dock-item__icon"><Icon name="sparkles" /></span>
                  <span className="dock-item__label"><span>Activate Agent</span></span>
                </Link>
              )}
            </div>
          </div>

          {menuOpen && isAuthenticated && user && (
            <div id="agent-menu" className="agent-dropdown">
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="agent-matrix__badge">
                    <span className="pulse-dot" />
                    AI Agent Active
                  </span>
                  <span className="tag tag--brand">{user.matchScore}% Match</span>
                </div>
                <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
                  {user.name} <span className="tag tag--brand" style={{ padding: '1px 6px', fontSize: 10 }}>{activePersona.badge}</span>
                </div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  {user.title}
                </div>
              </div>

              <div>
                <span className="field__hint" style={{ textTransform: 'uppercase', letterSpacing: 'var(--tracking-mono)' }}>
                  Switch Career Persona:
                </span>
                <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                  {(Object.keys(CAREER_PERSONAS) as CareerType[]).map((type) => {
                    const p = CAREER_PERSONAS[type];
                    const isCurrent = user.careerType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleSwitchType(type)}
                        aria-pressed={isCurrent}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          background: isCurrent ? 'var(--color-brand-subtle)' : 'var(--color-surface-sunken)',
                          border: `1px solid ${isCurrent ? 'var(--color-brand)' : 'var(--color-border)'}`,
                          color: isCurrent ? 'var(--color-brand-strong)' : 'var(--color-text)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{p.label}</span>
                        <span className="tag" style={{ fontSize: 9, padding: '1px 4px' }}>
                          {p.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AccentPicker compact value={user.accentColor} onChange={setAccentColor} onPreview={previewAccent} />

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', display: 'grid', gap: 6 }}>
                <Link to="/sign-in" className="btn btn--secondary btn--sm" style={{ justifyContent: 'flex-start' }}>
                  <Icon name="refresh" size={14} />
                  Manage Ingested Data
                </Link>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleLogout}
                  style={{ justifyContent: 'flex-start', color: 'var(--color-danger)' }}
                >
                  <Icon name="logout" size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
