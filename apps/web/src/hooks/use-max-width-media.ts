import { useEffect, useState } from 'react';

/**
 * Tracks whether the viewport matches `(max-width: maxPx)`. Updates on breakpoint cross.
 */
export function useMatchesMaxWidth(maxPx: number): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [maxPx]);

  return matches;
}
