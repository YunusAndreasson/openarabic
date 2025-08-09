import { useEffect, useRef, useState } from 'react';

/**
 * Stabilize a boolean value with a small delay to prevent UI flicker
 */
export function useStableBoolean(value: boolean, delayMs: number = 100): boolean {
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
