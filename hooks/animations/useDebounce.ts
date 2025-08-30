import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook for debouncing function calls to prevent rapid successive executions
 * Useful for preventing double-taps on buttons and other interactive elements
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): [T, boolean] {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (isDebouncing) return;

      setIsDebouncing(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to reset debouncing state
      timeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, delay);

      // Execute the callback
      return callback(...args);
    }) as T,
    [callback, delay, isDebouncing]
  );

  return [debouncedCallback, isDebouncing];
}
