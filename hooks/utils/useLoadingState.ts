import { useState, useCallback } from 'react';

type LoadingState = {
  isLoading: boolean;
  dataLoaded: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setDataLoaded: (loaded: boolean) => void;
  reset: () => void;
};


/**
 * Hook for managing loading states with simplified control.
 *
 * @param initialLoadingState - Initial loading state (default: true)
 * @returns Object with loading state and stable functions to control it
 */
export const useLoadingState = (initialLoadingState = true): LoadingState => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [dataLoaded, setDataLoadedState] = useState(false);

  // Callback helpers to update loading state
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setDataLoadedState(false);
  }, []);

  const stopLoading = useCallback(() => {
    setDataLoadedState(true);
    setIsLoading(false);
  }, []);

  const setDataLoaded = useCallback((loaded: boolean) => {
    setDataLoadedState(loaded);
    setIsLoading(!loaded);
  }, []);

  const reset = useCallback(() => {
    setDataLoadedState(false);
    setIsLoading(initialLoadingState);
  }, [initialLoadingState]);

  return {
    isLoading,
    dataLoaded,
    startLoading,
    stopLoading,
    setDataLoaded,
    reset,
  };
};
