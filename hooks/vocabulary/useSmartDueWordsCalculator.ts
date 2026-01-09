import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { CACHE_TIMES, fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { handleError } from '@/utils/errorHandling';

interface UseSmartDueWordsCalculatorOptions {
  /**
   * How long to wait after app becomes active before refreshing data (ms)
   * This prevents excessive API calls during rapid app state changes
   */
  refreshDelay?: number;
}

/**
 * Hook to intelligently calculate and refresh due words when app becomes active
 * This ensures memory strength and due words are always up-to-date
 */
export function useSmartDueWordsCalculator(options: UseSmartDueWordsCalculatorOptions = {}) {
  const { refreshDelay = 1000 } = options;
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const appStateRef = useRef(AppState.currentState);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = CACHE_TIMES.CRITICAL.staleTime; // 30 seconds minimum between refreshes

  /**
   * Calculate and refresh due words data
   * Optimized to avoid excessive API calls and improve performance
   */
  const refreshDueWordsData = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;

    // Debounce: Don't refresh if we just refreshed recently
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }

    try {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      lastRefreshRef.current = now;

      // Use Promise.allSettled to avoid blocking on individual failures
      const refreshPromises = [
        // Refresh due words with fresh data
        queryClient.fetchQuery({
          queryKey: fsrsQueries.due(user.id).queryKey,
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              onlyDue: true,
              sessionCooldownHours: 1,
              limit: 100,
            }),
          staleTime: 0, // Always fetch fresh
          gcTime: CACHE_TIMES.CRITICAL.gcTime, // 2 minutes cache
        }),

        // Refresh all words for accurate memory strength calculation
        queryClient.fetchQuery({
          queryKey: fsrsQueries.all(user.id).queryKey,
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              forStats: false,
              limit: 1000,
            }),
          staleTime: 0, // Always fetch fresh
          gcTime: CACHE_TIMES.SHORT.gcTime, // 5 minutes cache
        }),
      ];

      // Execute all refreshes in parallel for better performance
      await Promise.allSettled(refreshPromises);
    } catch (error) {
      handleError(error as Error, {
        showToast: false,
        analyticsEventName: 'Due_Words_Refresh_Error',
      });
    }
  }, [user?.id, isAuthenticated, queryClient]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasInactive = appStateRef.current !== 'active';
      const isActivating = wasInactive && nextAppState === 'active';

      appStateRef.current = nextAppState;

      // When app becomes active after being inactive, refresh due words
      if (isActivating && user?.id && isAuthenticated) {
        if (refreshDelay > 0) {
          // Delay refresh to avoid excessive API calls during rapid state changes
          refreshTimeoutRef.current = setTimeout(() => {
            refreshDueWordsData();
          }, refreshDelay);
        } else {
          refreshDueWordsData();
        }
      }

      // When app becomes inactive, clear any pending refresh
      if (nextAppState !== 'active' && refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [refreshDueWordsData, refreshDelay, user?.id, isAuthenticated]);

  /**
   * Manual refresh function for immediate updates
   */
  const forceRefresh = useCallback(() => {
    refreshDueWordsData();
  }, [refreshDueWordsData]);

  return {
    forceRefresh,
    isRefreshing: refreshTimeoutRef.current !== null,
  };
}
