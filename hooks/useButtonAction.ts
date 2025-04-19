import { useRef, useCallback, useEffect } from 'react';

import { ANIMATION_TIMING } from '../constants/animations';

/**
 * Custom hook for button actions with debounce
 * Prevents multiple rapid button presses
 *
 * @param fn The function to execute when button is pressed
 * @param delay Optional delay in milliseconds (defaults to STANDARD debounce time)
 * @returns A debounced function that executes the action
 */
export function useButtonAction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = ANIMATION_TIMING.DEBOUNCE.STANDARD
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingRef = useRef(false);

  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      const timeout = timeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Skip if already executing
      if (isExecutingRef.current) return;

      // Set executing flag
      isExecutingRef.current = true;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the timeout
      timeoutRef.current = setTimeout(() => {
        fn(...args);
        isExecutingRef.current = false;
      }, delay);
    },
    [fn, delay]
  );
}
