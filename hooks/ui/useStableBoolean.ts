import { useEffect, useRef, useState } from 'react';

import { TIMING_CONSTANTS } from '@/constants/animation';

/**
 * Stabilize a boolean value with a small delay to prevent UI flicker
 */
export function useStableBoolean(
  value: boolean,
  delayMs: number = TIMING_CONSTANTS.QUICK_DELAY
): boolean {
  const [stable, setStable] = useState<boolean>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (value !== stable) {
      timeoutRef.current = setTimeout(() => {
        setStable(value);
      }, delayMs);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delayMs, stable]);

  return stable;
}

export default useStableBoolean;
