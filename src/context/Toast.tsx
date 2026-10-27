import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { base } from '../lib/motion';

export interface ToastOptions {
  /** Optional action, e.g. Undo. Shown as a button inside the toast. */
  action?: { label: string; onClick: () => void };
  /** How long the toast stays, in ms. Undo toasts use 7s (within the 5–10s range). */
  duration?: number;
}

interface ToastState extends ToastOptions { id: number; msg: string }

const ToastContext = createContext<(msg: string, opts?: ToastOptions) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>();

  const startTimer = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const show = useCallback((msg: string, opts: ToastOptions = {}) => {
    setToast({ id: Date.now(), msg, ...opts });
  }, []);

  useEffect(() => {
    if (toast) startTimer(toast.duration ?? (toast.action ? 7000 : 3000));
    return () => window.clearTimeout(timer.current);
  }, [toast, startTimer]);

  // Pause while hovered or focused so nobody loses the Undo while reaching for it.
  const pause = () => window.clearTimeout(timer.current);
  const resume = () => toast && startTimer(2500);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite" role="status">
        <AnimatePresence mode="wait">
          {toast && (
            <m.div key={toast.id} className="toast glass glass--strong"
              onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={base}>
              <span>{toast.msg}</span>
              {toast.action && (
                <button className="toast__action" onClick={() => { toast.action!.onClick(); setToast(null); }}>
                  {toast.action.label}
                </button>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
