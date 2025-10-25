import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { canUseBadge, clearAppBadge, setAppBadgeCount } from '@/services/notificationService';

/**
 * Hook that efficiently monitors due words count and updates the app badge
 * Uses Expo's permission system and AppState for optimal performance
 */
export function useAppBadge(): void {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Track current badge count to avoid unnecessary updates
  const currentBadgeCountRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Efficient badge permission state
  const [canUseBadgeState, setCanUseBadgeState] = useState<boolean>(false);

  // Check badge permissions once when component mounts
  useEffect(() => {
    const checkBadgePermission = async () => {
      const badgeAllowed = await canUseBadge();
      setCanUseBadgeState(badgeAllowed);
    };

    checkBadgePermission();
  }, []);

  // Get due words data efficiently
  const { dueWords, isLoading } = useFSRSQueries({
    userId: user?.id,
    limit: undefined, // We want all due words for badge count
  });

  // Debounced badge update to prevent rapid changes
  const updateBadgeDebounced = useCallback(
    async (count: number) => {
      // Don't update if count hasn't changed
      if (currentBadgeCountRef.current === count) return;

      // Rate limit updates to prevent spam
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate < 1000) {
        // 1 second minimum between updates
        return;
      }

      // Only update if badge permissions allow it
      if (canUseBadgeState) {
        const success = await setAppBadgeCount(count);
        if (success) {
          currentBadgeCountRef.current = count;
          lastUpdateTimeRef.current = now;
        }
      }
    },
    [canUseBadgeState],
  );

  // Clear badge efficiently
  const clearBadge = useCallback(async () => {
    if (currentBadgeCountRef.current === 0) return; // Already cleared
    if (!canUseBadgeState) return; // No permission to clear

    const success = await clearAppBadge();
    if (success) {
      currentBadgeCountRef.current = 0;
    }
  }, [canUseBadgeState]);

  // Update badge when due words change (only when app is active)
  useEffect(() => {
    if (!isAuthenticated || isLoading || appStateRef.current !== 'active') {
      return;
    }

    const dueWordsCount = dueWords?.length ?? 0;
    updateBadgeDebounced(dueWordsCount);
  }, [dueWords, isAuthenticated, isLoading, updateBadgeDebounced]);

  // Clear badge when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      clearBadge();
    }
  }, [isAuthenticated, clearBadge]);

  // Handle app state changes for optimal battery life
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;

      // Update badge when app comes to foreground if we have due words
      if (nextAppState === 'active' && isAuthenticated && !isLoading && dueWords) {
        const dueWordsCount = dueWords.length ?? 0;
        updateBadgeDebounced(dueWordsCount);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, isLoading, dueWords, updateBadgeDebounced]);

  // Efficient query invalidation listener using React Query v5 patterns
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const queryKey = FSRS_QUERY_KEYS.due(user.id);

    // Use query invalidation instead of cache subscription for better performance
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      // Only react to query updates for our specific key
      if (event.type === 'updated' && event.query.queryKey === queryKey) {
        const newDueWords = event.query.state.data as any[];
        if (newDueWords && appStateRef.current === 'active') {
          updateBadgeDebounced(newDueWords.length ?? 0);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.id, isAuthenticated, queryClient, updateBadgeDebounced]);
}
