import { useFocusEffect } from '@react-navigation/native';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { handleError } from '@/utils/errorHandling';

/**
 * Hook to refresh data when a screen comes into focus.
 * Uses a ref to store state and props, ensuring stable callbacks
 * and preventing the hook from causing unnecessary re-renders in the parent component.
 *
 * @param queryClient React Query client instance.
 * @param queryKey Base query key (string) for the data to refresh.
 * @param userId Optional user ID to include in the query key.
 * @param staleTime Time in ms after which data is considered stale (default: 60000ms).
 * @param skipInitialFocus Whether to skip refresh on the very first focus event after mount (default: true).
 * @param forceRefreshOnFocus Force refresh on every focus, regardless of staleness (default: false).
 * @param throttleInterval Minimum time in ms between refreshes (default: 1000ms).
 * @returns Object with a stable `refreshData` function.
 */
export const useScreenFocusRefresh = (
  queryClient: QueryClient,
  queryKey: string,
  userId: string | undefined,
  staleTime = 60000,
  skipInitialFocus = true,
  forceRefreshOnFocus = false,
  throttleInterval = 1000
): { refreshData: () => void } => {
  // Ref holds all hook state and props to ensure stability of callbacks.
  const stateRef = useRef({
    isInitialMount: true,
    lastRefreshTime: 0,
    // Store props in ref
    queryClient,
    queryKey,
    userId,
    staleTime,
    skipInitialFocus,
    forceRefreshOnFocus,
    throttleInterval,
    // Derived state
    fullQueryKey: [] as QueryKey,
  });

  // Update ref with the latest props on each render.
  // This does not trigger re-renders but ensures callbacks access fresh values.
  stateRef.current.queryClient = queryClient;
  stateRef.current.queryKey = queryKey;
  stateRef.current.userId = userId;
  stateRef.current.staleTime = staleTime;
  stateRef.current.skipInitialFocus = skipInitialFocus;
  stateRef.current.forceRefreshOnFocus = forceRefreshOnFocus;
  stateRef.current.throttleInterval = throttleInterval;
  stateRef.current.fullQueryKey = (userId ? [queryKey, userId] : [queryKey]) as QueryKey;

  // Stable refresh function that reads current state from the ref.
  // Dependency array is empty, making this function reference stable.
  const refreshData = useCallback(() => {
    const state = stateRef.current;
    // Skip if no user ID is provided
    if (!state.userId) return;

    // Throttle refreshes to prevent rapid calls
    const now = Date.now();
    if (now - state.lastRefreshTime < state.throttleInterval) return; // Throttle for interval

    state.lastRefreshTime = now;
    // Invalidate the query after interactions to avoid blocking UI
    InteractionManager.runAfterInteractions(() => {
      try {
        state.queryClient.invalidateQueries({ queryKey: state.fullQueryKey });
      } catch (error) {
        handleError(error as Error, { showToast: false });
      }
    });
  }, []);

  // Focus effect using the stable refreshData callback.
  // The outer useCallback has refreshData as a dependency, but since
  // refreshData itself is stable, this outer callback is also stable.
  useFocusEffect(
    useCallback(() => {
      const state = stateRef.current;

      // Skip the effect on the initial mount/focus if configured
      if (state.isInitialMount && state.skipInitialFocus) {
        state.isInitialMount = false; // Mark initial mount as passed
        return; // Skip the first execution
      }

      // Determine if a refresh is needed based on configuration and data staleness
      let shouldRefresh = state.forceRefreshOnFocus;
      if (!shouldRefresh) {
        const now = Date.now();
        const queryState = state.queryClient.getQueryState(state.fullQueryKey);
        const isStale =
          !queryState?.dataUpdatedAt || // No data exists yet
          now - queryState.dataUpdatedAt > state.staleTime; // Data is older than staleTime
        shouldRefresh = isStale;
      }

      // Trigger refresh if needed
      if (shouldRefresh) {
        refreshData();
      }

      // Ensure subsequent focus events aren't treated as initial
      state.isInitialMount = false;

      // No cleanup needed for this effect
    }, [refreshData]) // Dependency is stable
  );

  // Return the stable refresh function for potential manual triggering
  return { refreshData };
};
