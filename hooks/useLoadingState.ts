import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for managing loading states with a minimum display time
 * to prevent flickering and provide a smoother user experience.
 *
 * @param minLoadingTime - Minimum time in ms to show loading state (default: 500ms)
 * @param initialLoadingState - Initial loading state (default: true)
 * @returns Object with loading state and functions to control it
 */
export const useLoadingState = (minLoadingTime = 500, initialLoadingState = true) => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

  // Start loading with minimum display time
  const startLoading = useCallback(() => {
    // Clear any existing timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }

    setIsLoading(true);
    loadingStartTime.current = Date.now();
    dataLoadedRef.current = false;
  }, []);

  // Stop loading with minimum display time guarantee
  const stopLoading = useCallback(() => {
    // Mark data as loaded
    dataLoadedRef.current = true;

    // If loading hasn't started, just stop
    if (loadingStartTime.current === null) {
      setIsLoading(false);
      return;
    }

    // Calculate elapsed time
    const timeElapsed = Date.now() - loadingStartTime.current;

    // If minimum time has passed, stop loading immediately
    if (timeElapsed >= minLoadingTime) {
      setIsLoading(false);
      loadingStartTime.current = null;
    } else {
      // Otherwise, set a timeout to stop loading after minimum time
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingStartTime.current = null;
      }, minLoadingTime - timeElapsed);
    }
  }, [minLoadingTime]);

  // Set data loaded state
  const setDataLoaded = useCallback((loaded: boolean) => {
    dataLoadedRef.current = loaded;
  }, []);

  // Reset the entire loading state
  const reset = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
    loadingStartTime.current = null;
    dataLoadedRef.current = false;
    setIsLoading(initialLoadingState);
  }, [initialLoadingState]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    reset,
    dataLoaded: dataLoadedRef.current,
    setDataLoaded,
  };
};
