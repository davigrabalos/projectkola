import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useRevealHighlight } from '../hooks/useRevealHighlight';

export function Layout() {
  const { pathname } = useLocation();
  useRevealHighlight();
  // Scroll to top on page change (not on filter/query changes) so users always land at the top of a new page.
  // Layout effect: runs inside the same commit, so view-transition snapshots already show the top of the page.
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      {/* Keyed by path: each new page rises in (CSS). Query-string changes (filters) do not re-trigger it. */}
      <main id="main" tabIndex={-1} key={pathname} className="anim-rise">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
