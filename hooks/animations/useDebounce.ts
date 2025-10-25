import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook for debouncing function calls to prevent rapid successive executions
 * Useful for preventing double-taps on buttons and other interactive elements
 *
 * Note: This executes immediately on first call, then blocks subsequent calls for the delay period
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
): [T, boolean] {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      // Block if currently debouncing
      if (isDebouncing) return;

      // Execute the callback immediately
      const result = callback(...args);

      // Set debouncing state to block subsequent calls
      setIsDebouncing(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to reset debouncing state
      timeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, delay);

      return result;
    }) as T,
    [callback, delay, isDebouncing],
  );

  return [debouncedCallback, isDebouncing];
}
