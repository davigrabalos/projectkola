import { useEffect, useRef, type ReactNode } from 'react';
import type { PanInfo } from 'motion/react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Icon } from './Icon';
import { fast, spring } from '../lib/motion';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Accessible acrylic slide-in panel for the mobile menu and mobile filters.
 * Portalled to <body>: ancestors with backdrop-filter or transform (the glass header,
 * animated page wrapper) would otherwise become the containing block for position: fixed.
 */
export function Drawer({ open, onClose, title, side = 'right', children, footer }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // Parents usually pass an inline onClose; keep it in a ref so the effect below runs only on open/close.
  // (Re-running it on every render would steal focus back to the panel after each filter click.)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open]);

  const offset = side === 'left' ? '-100%' : '100%';
  const dir = side === 'left' ? -1 : 1; // direction that closes the drawer

  // Swipe to dismiss: close past ~30% of the width, or on a quick flick in the closing direction.
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const width = panel.current?.offsetWidth ?? 320;
    const distance = info.offset.x * dir;
    const velocity = info.velocity.x * dir;
    if (distance > width * 0.3 || velocity > 500) onClose();
  };
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <m.div key="backdrop" className="drawer-backdrop" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={fast} />
          <m.div key="panel" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
            className={`drawer glass glass--strong${side === 'left' ? ' drawer--left' : ''}`}
            initial={{ x: offset }} animate={{ x: 0 }} exit={{ x: offset, pointerEvents: 'none' }} transition={spring}
            drag="x" dragConstraints={{ left: 0, right: 0 }}
            dragElastic={side === 'left' ? { left: 1, right: 0 } : { left: 0, right: 1 }}
            dragMomentum={false} onDragEnd={onDragEnd}>
            <div className="drawer__header">
              <strong>{title}</strong>
              <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close" aria-keyshortcuts="Escape" title="Close (Esc)"><Icon name="close" /></button>
            </div>
            <div className="drawer__body">{children}</div>
            {footer && <div className="drawer__footer">{footer}</div>}
          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
