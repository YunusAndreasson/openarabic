import { useRef, useCallback, useEffect } from 'react';

import { handleError } from '@/utils/errorHandling';

import { ANIMATION_TIMING } from '@/constants/animations';

/**
 * Type for functions that can be used with useButtonAction
 */
export type ButtonActionFunction<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => Promise<TReturn> | TReturn;

/**
 * Custom hook for button actions with debounce
 * Prevents multiple rapid button presses
 *
 * @param fn The function to execute when button is pressed
 * @param delay Optional delay in milliseconds (defaults to STANDARD debounce time)
 * @returns A debounced function that executes the action
 */
export function useButtonAction<TArgs extends unknown[] = [], TReturn = void>(
  fn: ButtonActionFunction<TArgs, TReturn>,
  delay = ANIMATION_TIMING.DEBOUNCE.STANDARD
): (...args: TArgs) => void {
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
    (...args: TArgs) => {
      // Skip if already executing
      if (isExecutingRef.current) return;

      // Set executing flag
      isExecutingRef.current = true;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          await fn(...args);
        } catch (error) {
          handleError(error as Error);
        } finally {
          isExecutingRef.current = false;
        }
      }, delay);
    },
    [fn, delay]
  );
}
