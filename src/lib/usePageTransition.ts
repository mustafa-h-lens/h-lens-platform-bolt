import { useEffect, useState } from 'react';

const EXIT_MS = 160;

export function usePageTransition<T>(currentKey: T) {
  const [displayedKey, setDisplayedKey] = useState<T>(currentKey);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (currentKey === displayedKey) return;
    setPhase('out');
    const t = window.setTimeout(() => {
      setDisplayedKey(currentKey);
      setPhase('in');
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [currentKey, displayedKey]);

  return { displayedKey, phase };
}
