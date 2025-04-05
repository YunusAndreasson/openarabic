import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing loading states with simplified control.
 *
 * @param initialLoadingState - Initial loading state (default: true)
 * @returns Object with loading state and functions to control it
 */
export const useLoadingState = (
  initialLoadingState = true
): {
  isLoading: boolean;
  dataLoaded: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setDataLoaded: (loaded: boolean) => void;
  reset: () => void;
} => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [dataLoaded, setDataLoadedState] = useState(false);

  // Start loading
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setDataLoadedState(false);
  }, []);

  // Stop loading
  const stopLoading = useCallback(() => {
    setDataLoadedState(true);
    setIsLoading(false);
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

  // Reset the loading state
  const reset = useCallback(() => {
    setDataLoadedState(false);
    setIsLoading(initialLoadingState);
  }, [initialLoadingState]);

  return useMemo(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      reset,
      dataLoaded,
      setDataLoaded,
    }),
    [isLoading, startLoading, stopLoading, reset, dataLoaded, setDataLoaded]
  );
};
