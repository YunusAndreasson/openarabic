import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to manage setTimeout timers with automatic cleanup
 * Prevents memory leaks by tracking and clearing all timers on unmount
 *
 * @example
 * const { setTimer, clearTimer } = useTimerCleanup();
 * setTimer('fadeOut', () => fadeOut(), 300);
 * clearTimer('fadeOut'); // Cancel if needed
 */
export const useTimerCleanup = () => {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setTimer = useCallback((key: string, callback: () => void, delay: number) => {
    // Clear any existing timer with this key
    const existingTimer = timersRef.current.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer and store reference
    const timer = setTimeout(callback, delay);
    timersRef.current.set(key, timer);

    return timer;
  }, []);

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(key);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return { setTimer, clearTimer, clearAllTimers };
};
