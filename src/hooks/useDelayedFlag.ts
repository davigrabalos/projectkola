import { useEffect, useState } from 'react';

/** True only once `flag` has stayed true for `delay` ms. Stops skeletons flashing on fast loads. */
export function useDelayedFlag(flag: boolean, delay = 300) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!flag) { setLate(false); return; }
    const t = window.setTimeout(() => setLate(true), delay);
    return () => window.clearTimeout(t);
  }, [flag, delay]);
  return flag && late;
}
