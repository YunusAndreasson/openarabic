import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook for managing loading states with a minimum display time
 * to prevent flickering and provide a smoother user experience.
 *
 * @param minLoadingTime - Minimum time in ms to show loading state (default: 80ms)
 * @param initialLoadingState - Initial loading state (default: true)
 * @returns Object with loading state and functions to control it
 */
export const useLoadingState = (minLoadingTime = 80, initialLoadingState = true) => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [dataLoaded, setDataLoadedState] = useState(false);
  const loadingStartTime = useRef<number | null>(initialLoadingState ? Date.now() : null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  // Store the current minimum loading time which can be updated
  const currentMinLoadingTime = useRef(minLoadingTime);

  // Get current timestamp - memoized to avoid creating function on each render
  const getCurrentTime = useCallback(() => Date.now(), []);

  // Clear any existing timeout safely
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
  }, []);

  // Start loading with minimum display time
  const startLoading = useCallback(() => {
    clearLoadingTimeout();
    setIsLoading(true);
    setDataLoadedState(false);
    loadingStartTime.current = getCurrentTime();
  }, [getCurrentTime, clearLoadingTimeout]);

  // Stop loading with minimum display time guarantee
  const stopLoading = useCallback(() => {
    // Mark data as loaded
    setDataLoadedState(true);

    // If loading hasn't started, just stop
    if (loadingStartTime.current === null) {
      setIsLoading(false);
      return;
    }

    // Calculate elapsed time
    const timeElapsed = getCurrentTime() - loadingStartTime.current;

    // If minimum time has passed, stop loading immediately
    if (timeElapsed >= currentMinLoadingTime.current) {
      setIsLoading(false);
      loadingStartTime.current = null;
    } else {
      // Otherwise, set a timeout to stop loading after minimum time
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingStartTime.current = null;
      }, currentMinLoadingTime.current - timeElapsed);
    }
  }, [getCurrentTime, clearLoadingTimeout]);

  // Set data loaded state
  const setDataLoaded = useCallback(
    (loaded: boolean) => {
      setDataLoadedState(loaded);
      if (loaded) {
        stopLoading();
      } else {
        startLoading();
      }
    },
    [startLoading, stopLoading]
  );

  // Reset the entire loading state
  const reset = useCallback(() => {
    clearLoadingTimeout();
    loadingStartTime.current = initialLoadingState ? getCurrentTime() : null;
    setDataLoadedState(false);
    setIsLoading(initialLoadingState);
  }, [initialLoadingState, getCurrentTime, clearLoadingTimeout]);

  // Allow dynamic updating of minimum loading time
  const updateMinLoadingTime = useCallback((newMinTime: number) => {
    // Ensure we have a valid number that's not too small
    if (typeof newMinTime === 'number' && !isNaN(newMinTime)) {
      // Enforce a minimum value to prevent instant flashes
      currentMinLoadingTime.current = Math.max(10, newMinTime);
    }
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return clearLoadingTimeout;
  }, [clearLoadingTimeout]);

  return useMemo(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      reset,
      dataLoaded,
      setDataLoaded,
      updateMinLoadingTime,
    }),
    [isLoading, startLoading, stopLoading, reset, dataLoaded, setDataLoaded, updateMinLoadingTime]
  );
};
