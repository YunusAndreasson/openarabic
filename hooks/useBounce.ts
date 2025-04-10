/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from 'react';

interface BounceOptions {
  delay: number;
  leading?: boolean; // Execute on leading edge of timeout
  trailing?: boolean; // Execute on trailing edge of timeout
  maxWait?: number; // Maximum time to wait (for throttle)
}

/**
 * Hook for debouncing function calls
 * @param callback Function to debounce
 * @param delay Delay in ms
 * @param deps Optional dependencies to track
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): (...args: Parameters<T>) => void {
  return useBounce(callback, { delay, leading: false, trailing: true }, deps);
}

/**
 * Hook for throttling function calls
 * @param callback Function to throttle
 * @param limit Minimum time between calls
 * @param deps Optional dependencies to track
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: any[] = []
): (...args: Parameters<T>) => void {
  return useBounce(callback, { delay: limit, leading: true, trailing: true, maxWait: limit }, deps);
}

/**
 * Base hook for controlling function call timing
 * Can be configured for debounce or throttle behaviors
 */
export function useBounce<T extends (...args: any[]) => any>(
  callback: T,
  options: BounceOptions,
  deps: any[] = []
): (...args: Parameters<T>) => void {
  const { delay, leading = false, trailing = true, maxWait } = options;

  // Refs to track callback, timer and last call time
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallTimeRef = useRef<number | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const lastInvokeTimeRef = useRef<number>(0);
  const depsRef = useRef<any[]>(deps);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
    depsRef.current = deps;
  }, [callback, deps]);

  // Function to execute the callback
  const invoke = useCallback((time: number, args: Parameters<T>) => {
    lastInvokeTimeRef.current = time;
    callbackRef.current(...args);
  }, []);

  // Main function returned by the hook
  const bounced = useCallback(
    (...args: Parameters<T>): void => {
      const time = Date.now();
      lastArgsRef.current = args;

      // If this is the first call, track time
      if (lastCallTimeRef.current === null) {
        lastCallTimeRef.current = time;
      }

      // Calculate relevant time intervals
      const timeWaiting = time - (lastCallTimeRef.current || 0);
      const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

      const shouldInvoke =
        lastCallTimeRef.current === null || // First call
        timeSinceLastInvoke >= delay || // Delay has passed
        (maxWait !== undefined && timeWaiting >= maxWait); // Max wait exceeded

      // Clear any pending timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Handle leading edge execution
      if (leading && lastCallTimeRef.current === null) {
        invoke(time, args);
      } else if (shouldInvoke && maxWait !== undefined) {
        // Handle maxWait forced execution (throttle)
        invoke(time, args);
      } else if (trailing) {
        // Set up trailing edge execution
        timerRef.current = setTimeout(() => {
          lastCallTimeRef.current = null;

          if (lastArgsRef.current) {
            invoke(Date.now(), lastArgsRef.current);
          }
        }, delay);
      }

      // Update last call time
      lastCallTimeRef.current = time;
    },
    [delay, leading, trailing, maxWait, invoke]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return bounced;
}
