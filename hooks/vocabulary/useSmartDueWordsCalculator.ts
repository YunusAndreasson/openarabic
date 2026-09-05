import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { CACHE_TIMES, fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        setIsRefreshing(false);
      }

      lastRefreshRef.current = now;

      const userId = user.id;

      // Use Promise.allSettled to avoid blocking on individual failures.
      // Refresh through the shared factories — each key's ONLY queryFn lives in
      // the factory, so this writes fresh data into the exact cache entries the
      // observers read. staleTime: 0 forces the fetch past cache freshness.
      const refreshPromises = [
        // EVERY mounted due-words variant, not just the bare one. The due key
        // encodes (sessionCooldownHours, limit), so `due(userId)` alone writes
        // ['fsrs-words', id, 'due', null, null] — while the Practice screen's
        // count reads ['fsrs-words', id, 'due', DEFAULT_SESSION_COOLDOWN_HOURS,
        // PRACTICE_DUE_WORDS_LIMIT] and the app badge reads a third variant.
        // Both stayed stale across every background/foreground cycle, so the
        // "N to review today" number only ever moved on a full app restart.
        // `type: 'active'` refetches exactly the variants something is
        // rendering, instead of every stale leftover in the cache.
        queryClient.refetchQueries({ queryKey: fsrsQueries.duePrefix(userId), type: 'active' }),

        // The bare variant is also read straight from cache (with no observer)
        // by the due-backlog add gate, so it has to exist and be fresh even
        // when no screen mounts it — refetchQueries only touches entries that
        // are already there. Concurrent fetches of the same key are deduped.
        queryClient.query({ ...fsrsQueries.due(userId), staleTime: 0 }),

        // Refresh all words for accurate memory strength calculation
        queryClient.query({ ...fsrsQueries.all(userId), staleTime: 0 }),
      ];

      // Execute all refreshes in parallel for better performance
      await Promise.allSettled(refreshPromises);
    } catch (error) {
      void handleError(error, {
        showToast: false,
        analyticsEventName: 'Due_Words_Refresh_Error',
      });
    }
  }, [user, isAuthenticated, queryClient]);

  /**
   * Handle app state changes — useEffectEvent keeps the handler stable so the
   * AppState listener is registered once and always sees the latest values.
   */
  const handleAppStateChange = useEffectEvent((nextAppState: AppStateStatus) => {
    const wasInactive = appStateRef.current !== 'active';
    const isActivating = wasInactive && nextAppState === 'active';

    appStateRef.current = nextAppState;

    // When app becomes active after being inactive, refresh due words
    if (isActivating && user?.id && isAuthenticated) {
      if (refreshDelay > 0) {
        // Delay refresh to avoid excessive API calls during rapid state changes
        setIsRefreshing(true);
        refreshTimeoutRef.current = setTimeout(() => {
          refreshTimeoutRef.current = null;
          setIsRefreshing(false);
          void refreshDueWordsData();
        }, refreshDelay);
      } else {
        void refreshDueWordsData();
      }
    }

    // When app becomes inactive, clear any pending refresh
    if (nextAppState !== 'active' && refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
      setIsRefreshing(false);
    }
  });

  // Effect events are non-reactive and get a fresh identity on every render, so
  // `handleAppStateChange` must stay OUT of the dependency array (enforced by
  // react-hooks/exhaustive-deps). Listing it re-ran this effect on every render,
  // and the cleanup then cleared the pending `refreshDelay` timer — which the
  // handler's own `setIsRefreshing(true)` had just scheduled a render for. The
  // delayed refresh was therefore cancelled before it could ever fire.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Manual refresh function for immediate updates
   */
  const forceRefresh = useCallback(() => {
    void refreshDueWordsData();
  }, [refreshDueWordsData]);

  return {
    forceRefresh,
    isRefreshing,
  };
}
