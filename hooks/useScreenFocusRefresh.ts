import { useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Hook to refresh data when a screen comes into focus
 * Prevents unnecessary refreshes on initial mount
 *
 * @param queryClient - React Query client instance
 * @param queryKey - Query key to invalidate
 * @param userId - User ID to include in query key
 * @param staleTime - Time in ms after which data is considered stale (default: 60000ms)
 * @param skipInitialFocus - Whether to skip refresh on initial focus (default: true)
 * @returns Object with manual refresh function
 */
export const useScreenFocusRefresh = (
  queryClient: QueryClient,
  queryKey: string,
  userId: string | undefined,
  staleTime = 60000,
  skipInitialFocus = true
): { refreshData: () => void } => {
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Store the previous query key and userId to detect changes
  const prevQueryKey = useRef(queryKey);
  const prevUserId = useRef(userId);

  // Create the full query key
  const fullQueryKey: QueryKey = [queryKey, userId];

  // Function to check if data is stale and refresh if needed
  const checkAndRefreshData = useCallback(() => {
    // Only refresh if we have a user ID
    if (!userId) return;

    // Check if data is stale before refreshing
    const queryData = queryClient.getQueryState(fullQueryKey);
    const isDataStale = queryData?.dataUpdatedAt
      ? Date.now() - queryData.dataUpdatedAt > staleTime
      : true;

    // Only refresh if data is stale
    if (isDataStale) {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
    }
  }, [queryClient, fullQueryKey, userId, staleTime]);

  // Manual refresh function that bypasses stale check
  const refreshData = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
    }
  }, [queryClient, fullQueryKey, userId]);

  // Check if queryKey or userId has changed
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      return;
    }

    // If queryKey or userId changed, check if we need to refresh
    if (prevQueryKey.current !== queryKey || prevUserId.current !== userId) {
      checkAndRefreshData();

      // Update refs with new values
      prevQueryKey.current = queryKey;
      prevUserId.current = userId;
    }
  }, [queryKey, userId, checkAndRefreshData]);

  // Use a separate callback for the focus effect to ensure proper dependency tracking
  const handleFocusEffect = useCallback(() => {
    // Skip refresh on initial focus if requested
    if (isInitialMount.current && skipInitialFocus) {
      isInitialMount.current = false;
      return;
    }

    // Check if data needs refreshing
    checkAndRefreshData();

    // Mark as not initial mount after first focus
    isInitialMount.current = false;

    // Update refs with current values
    prevQueryKey.current = queryKey;
    prevUserId.current = userId;
  }, [checkAndRefreshData, skipInitialFocus, queryKey, userId]);

  // Register the focus effect
  useFocusEffect(handleFocusEffect);

  return { refreshData };
};
