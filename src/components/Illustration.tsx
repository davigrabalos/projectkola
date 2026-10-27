import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* Illustrations from unDraw (undraw.co, free licence, no attribution needed), recoloured for Kola:
   their fixed palette was swapped for role classes (.ia accent, .ik ink, .ip paper...) styled in
   components.css, so they follow the personal accent and both themes. Each SVG is its own lazy
   chunk; the aspect ratio is known up front so nothing shifts while one loads.
   Motion is CSS only (see "Illustrations" in components.css): the accent parts pop in the first
   time the art is seen, the hero floats while on screen, and art with data-tilt leans toward the pointer. */
const RATIOS = {
  'ai-personal-assistant': 960 / 556.2,
  bookmarks: 1024.3 / 646.4,
  'career-growth': 518.3 / 800,
  'connection-lost': 800 / 430.5,
  'launch-event': 808.2 / 577.2,
  'my-resume': 492.4 / 800,
  'online-profile': 768.2 / 800,
  'out-of-office': 960 / 660.4,
  'painting-the-room': 960 / 698.4,
  'personal-goals': 988.5 / 775,
  'searching-everywhere': 881.8 / 800,
  searching: 618.7 / 800,
  'stepping-up': 800 / 600,
  'the-void': 650.9 / 800,
} as const;

export type IllustrationName = keyof typeof RATIOS;

const files = import.meta.glob<string>('../assets/illustrations/*.svg', { query: '?raw', import: 'default' });
const cache = new Map<IllustrationName, string>();

const load = (name: IllustrationName) =>
  files[`../assets/illustrations/${name}.svg`]().then((svg) => {
    cache.set(name, svg);
    return svg;
  });

/** Warm the chunk ahead of time (e.g. the next onboarding step). */
export const preloadIllustration = (name: IllustrationName) => {
  if (!cache.has(name)) load(name).catch(() => {});
};

/** hero: entrance + float + parallax + tilt. empty: entrance + tilt. step: entrance only (replays per level). */
export type IllustrationPreset = 'hero' | 'empty' | 'step';

// One observer for every illustration: data-seen is set once (entrance plays once),
// data-in follows visibility (looping motion pauses off screen).
let observer: IntersectionObserver | undefined;
const watch = (el: Element) => {
  if (!('IntersectionObserver' in window)) { el.setAttribute('data-seen', ''); return () => {}; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      e.target.toggleAttribute('data-in', e.isIntersecting);
      if (e.isIntersecting) e.target.setAttribute('data-seen', '');
    }
  }, { threshold: 0.15 });
  observer.observe(el);
  return () => observer?.unobserve(el);
};

export function Illustration({ name, className = '', preset = 'empty', cheer = 0 }: {
  name: IllustrationName;
  className?: string;
  preset?: IllustrationPreset;
  /** Bump to make the accent parts pop (e.g. on an XP gain). */
  cheer?: number;
}) {
  const [svg, setSvg] = useState(() => cache.get(name) ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ref.current) return watch(ref.current); }, []);

  // Stagger index for the entrance, set once per inserted SVG (capped in CSS).
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<SVGElement>('.ia, .ib').forEach((el, n) => el.style.setProperty('--n', String(n)));
  }, [svg]);

  useEffect(() => {
    const el = ref.current;
    if (!cheer || !el) return;
    el.setAttribute('data-cheer', '');
    const t = window.setTimeout(() => el.removeAttribute('data-cheer'), 360);
    return () => window.clearTimeout(t);
  }, [cheer]);

  useEffect(() => {
    const hit = cache.get(name);
    if (hit) { setSvg(hit); return; }
    let live = true;
    setSvg('');
    load(name).then((s) => live && setSvg(s)).catch(() => {});
    return () => { live = false; };
  }, [name]);

  // Decorative: the surrounding heading and text carry the meaning.
  return (
    <div
      ref={ref}
      className={`illo ${className}`}
      data-preset={preset}
      data-tilt={preset === 'step' ? undefined : ''}
      aria-hidden="true"
      style={{ aspectRatio: RATIOS[name] }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
