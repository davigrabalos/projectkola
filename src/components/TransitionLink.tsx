import { forwardRef, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';
import { withViewTransition } from '../lib/viewTransition';

interface Props extends LinkProps {
  /** Called right before the transition starts, e.g. to tag elements with a view-transition-name. */
  onBeforeTransition?: () => void;
}

/**
 * A Link whose navigation runs inside a same-document view transition.
 * Uses the browser API directly, so the app doesn't need React Router's heavier data router.
 * Modified clicks (new tab, etc.) keep normal link behaviour.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, Props>(function TransitionLink(
  { onBeforeTransition, onClick, to, replace, state, ...rest },
  ref,
) {
  const navigate = useNavigate();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onBeforeTransition?.();
    withViewTransition(() => flushSync(() => navigate(to, { replace, state })));
  };
  return <Link ref={ref} to={to} replace={replace} state={state} onClick={handleClick} {...rest} />;
});
