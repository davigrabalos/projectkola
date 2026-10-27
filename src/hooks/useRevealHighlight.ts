import { useEffect } from 'react';

/**
 * Windows 10 "Reveal" border light, done cheaply:
 * - one passive pointermove listener for the whole document,
 * - throttled to one update per animation frame,
 * - writes two CSS variables on the single `.reveal` element under the cursor,
 * - and the pointer position (-0.5..0.5) as --tx/--ty on the `[data-tilt]` illustration under it.
 * Skipped on touch-only devices, where there is no hover.
 */
export function useRevealHighlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    let target: Element | null = null;
    let current: HTMLElement | null = null;
    let tilted: HTMLElement | null = null;

    const tilt = (el: HTMLElement | null) => {
      if (tilted && tilted !== el) {
        tilted.style.removeProperty('--tx');
        tilted.style.removeProperty('--ty');
      }
      tilted = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', ((x - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty('--ty', ((y - r.top) / r.height - 0.5).toFixed(3));
    };

    const paint = () => {
      frame = 0;
      tilt((target?.closest('[data-tilt]') as HTMLElement | null) ?? null);
      const el = (target?.closest('.reveal') as HTMLElement | null) ?? null;
      if (current && current !== el) {
        current.style.removeProperty('--mx');
        current.style.removeProperty('--my');
      }
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${x - r.left}px`);
      el.style.setProperty('--my', `${y - r.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      target = e.target as Element;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // Leaving the window: let tilted art spring back.
    const onOut = (e: PointerEvent) => { if (!e.relatedTarget) { target = null; if (!frame) frame = requestAnimationFrame(paint); } };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      cancelAnimationFrame(frame);
    };
  }, []);
}
