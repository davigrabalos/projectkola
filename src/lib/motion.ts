import type { Transition, Variants } from 'motion/react';

/** Shared easing: matches --ease-out-expo in tokens.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const fast: Transition = { duration: 0.18, ease: EASE_OUT_EXPO };
export const base: Transition = { duration: 0.32, ease: EASE_OUT_EXPO };
export const slow: Transition = { duration: 0.5, ease: EASE_OUT_EXPO };

/**
 * Springs for anything a user can interrupt (drawers, swipes). A spring restarts from the
 * element's current position and velocity, so reversing mid-animation never jumps.
 */
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 };

/** Rise-in used for page content and list items. Opacity + transform only (GPU-friendly). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 }, // same 8px as the CSS kola-rise
  show: { opacity: 1, y: 0, transition: base },
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});
