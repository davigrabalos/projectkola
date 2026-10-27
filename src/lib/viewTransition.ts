/**
 * Runs a DOM update inside a same-document view transition when the browser supports it
 * and the user hasn't asked for reduced motion. Otherwise just runs the update.
 */
export function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }
  doc.startViewTransition(update);
}
