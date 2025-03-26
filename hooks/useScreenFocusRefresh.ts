import { useCallback, useRef, useEffect, useMemo } from 'react';
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
 * @param forceRefreshOnFocus - Force refresh even if data is not stale (default: false)
 * @returns Object with manual refresh function
 */
export const useScreenFocusRefresh = (
  queryClient: QueryClient,
  queryKey: string,
  userId: string | undefined,
  staleTime = 60000, // Default to 1 minute cache
  skipInitialFocus = true,
  forceRefreshOnFocus = false // Only refresh if data is stale by default
): { refreshData: () => void } => {
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Store the previous query key and userId to detect changes
  const prevQueryKey = useRef(queryKey);
  const prevUserId = useRef(userId);

  // Create the full query key
  const fullQueryKey = useMemo(() => [queryKey, userId] as QueryKey, [queryKey, userId]);

  // Function to check if data is stale and refresh if needed
  const checkAndRefreshData = useCallback(() => {
    // Only refresh if we have a user ID
    if (!userId) return;

    // Check if data is stale before refreshing
    const queryData = queryClient.getQueryState(fullQueryKey);

    // Consider data stale if:
    // 1. queryData is null (query doesn't exist)
    // 2. dataUpdatedAt is undefined
    // 3. dataUpdatedAt is older than staleTime
    const isDataStale =
      !queryData || !queryData.dataUpdatedAt || Date.now() - queryData.dataUpdatedAt > staleTime;

    // Force refresh if requested or if data is stale
    if (forceRefreshOnFocus || isDataStale) {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
    }
  }, [queryClient, fullQueryKey, userId, staleTime, forceRefreshOnFocus]);

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
      // Only refresh if we have a userId
      if (userId) {
        // Create the new query key with the updated values
        const newQueryKey: QueryKey = [queryKey, userId];
        queryClient.invalidateQueries({ queryKey: newQueryKey });
      }

      // Update refs with new values
      prevQueryKey.current = queryKey;
      prevUserId.current = userId;
    }
  }, [queryKey, userId, queryClient]);

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
