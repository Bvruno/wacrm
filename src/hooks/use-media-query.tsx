'use client';

import { useEffect, useState } from 'react';

/**
 * Reactive matchMedia hook. Live-updates when the query result changes
 * (resize, device rotation). Shared by every component that needs a
 * JS-side breakpoint mirror (keep in sync with the Tailwind class you
 * pair it with).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Safari < 14 still uses addListener; addEventListener is the
    // modern path. Both fire identically.
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
