import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';

const loadFeatures = () => import('../lib/motion-features').then((m) => m.default);

/**
 * Motion setup:
 * - LazyMotion + `m` components: ~5 KB up front, engine loaded in a separate chunk.
 * - `strict` stops anyone from importing the heavy `motion` component by mistake.
 * - reducedMotion="user" turns transforms off for people who ask the OS for less motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
