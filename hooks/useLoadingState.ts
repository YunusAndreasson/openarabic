import { useState, useCallback, useMemo, useRef } from 'react';

type LoadingState = {
  isLoading: boolean;
  dataLoaded: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setDataLoaded: (loaded: boolean) => void;
  reset: () => void;
};

type LoadingCallbacks = {
  startLoading: () => void;
  stopLoading: () => void;
  setDataLoaded: (loaded: boolean) => void;
  reset: () => void;
};

const noop = () => {};
const noopSetLoaded = (_loaded: boolean) => {};

/**
 * Hook for managing loading states with simplified control.
 *
 * @param initialLoadingState - Initial loading state (default: true)
 * @returns Object with loading state and stable functions to control it
 */
export const useLoadingState = (initialLoadingState = true): LoadingState => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [dataLoaded, setDataLoadedState] = useState(false);

  // Use refs to hold stable callbacks to avoid including them in dependencies
  const callbacksRef = useRef<LoadingCallbacks>({
    startLoading: noop,
    stopLoading: noop,
    setDataLoaded: noopSetLoaded,
    reset: noop,
  });

  // Define the actual logic, these will be assigned to the ref
  const startLoadingLogic = useCallback(() => {
    setIsLoading(true);
    setDataLoadedState(false); // Reset data loaded when starting load
  }, []);

  const stopLoadingLogic = useCallback(() => {
    // Only set data loaded to true when explicitly stopped
    setDataLoadedState(true);
    setIsLoading(false);
  }, []);

  const setDataLoadedLogic = useCallback((loaded: boolean) => {
    setDataLoadedState(loaded);
    // Sync isLoading state based on explicit data loaded status
    setIsLoading(!loaded);
  }, []);

  const resetLogic = useCallback(() => {
    setDataLoadedState(false);
    setIsLoading(initialLoadingState);
  }, [initialLoadingState]);

  // Assign logic to the ref's stable callbacks
  callbacksRef.current.startLoading = startLoadingLogic;
  callbacksRef.current.stopLoading = stopLoadingLogic;
  callbacksRef.current.setDataLoaded = setDataLoadedLogic;
  callbacksRef.current.reset = resetLogic;

  // Return state values and stable callback references from the ref
  return useMemo(
    () => ({
      isLoading,
      dataLoaded,
      // Return the stable functions from the ref
      startLoading: callbacksRef.current.startLoading,
      stopLoading: callbacksRef.current.stopLoading,
      setDataLoaded: callbacksRef.current.setDataLoaded,
      reset: callbacksRef.current.reset,
    }),
    [isLoading, dataLoaded] // Only re-memoize when state values change
  );
};
