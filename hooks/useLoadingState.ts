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
  const [dataLoaded, setDataLoadedState] = useState(false);
  const loadingStartTime = useRef<number | null>(initialLoadingState ? Date.now() : null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedButWaitingRef = useRef(false);
  // Store the current minimum loading time which can be updated
  const currentMinLoadingTime = useRef(minLoadingTime);

  // Start loading with minimum display time
  const startLoading = useCallback(() => {
    // Clear any existing timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }

    dataLoadedButWaitingRef.current = false;
    setIsLoading(true);
    setDataLoadedState(false);
    loadingStartTime.current = Date.now();
  }, []);

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
    const timeElapsed = Date.now() - loadingStartTime.current;

    // If minimum time has passed, stop loading immediately
    if (timeElapsed >= currentMinLoadingTime.current) {
      setIsLoading(false);
      loadingStartTime.current = null;
      dataLoadedButWaitingRef.current = false;
    } else {
      // Otherwise, set a timeout to stop loading after minimum time
      dataLoadedButWaitingRef.current = true;
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingStartTime.current = null;
        dataLoadedButWaitingRef.current = false;
      }, currentMinLoadingTime.current - timeElapsed);
    }
  }, []);

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
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
    dataLoadedButWaitingRef.current = false;
    loadingStartTime.current = initialLoadingState ? Date.now() : null;
    setDataLoadedState(false);
    setIsLoading(initialLoadingState);
  }, [initialLoadingState]);

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
    dataLoaded,
    setDataLoaded,
    updateMinLoadingTime,
  };
};
