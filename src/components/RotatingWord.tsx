import { useEffect, useState } from 'react';

/**
 * A word that rolls to the next one in `words` every `every` ms. CSS does the roll (pages.css,
 * "Rotating word"); this only advances the index, and not while the tab is hidden.
 * Decorative: give the surrounding heading a static text alternative. Reduced motion shows `still`.
 */
export function RotatingWord({ words, still, every = 2600 }: { words: readonly string[]; still: string; every?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => { if (!document.hidden) setN((x) => (x + 1) % words.length); }, every);
    return () => window.clearInterval(t);
  }, [words.length, every]);

  const out = (n - 1 + words.length) % words.length;
  return (
    <span className="rotating-word" aria-hidden="true">
      <span className="rotating-word__still">{still}</span>
      {words.map((w, i) => (
        <span key={w} className="rotating-word__item" data-state={i === n ? 'in' : i === out ? 'out' : undefined}>{w}</span>
      ))}
    </span>
  );
}
