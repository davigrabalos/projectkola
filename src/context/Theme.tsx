import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { withViewTransition } from '../lib/viewTransition';

export type Theme = 'dark' | 'light';
const KEY = 'kola:theme';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} });

/** Dark graphite is the brand default. index.html applies the saved theme before first paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim());
    try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    // Crossfade the whole page; flushSync so the new theme is in the DOM when the snapshot is taken.
    withViewTransition(() => flushSync(() => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }));
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
