import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { canUseBadge, clearAppBadge, setAppBadgeCount } from '@/services/notificationService';
import type { StudyWord } from '@/types/vocabulary.types';

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

  // useEffectEvent isolates the listener bodies from their dependency closures
  // so subscriptions don't tear down / re-attach on every dueWords change.
  const handleAppStateChange = useEffectEvent((nextAppState: AppStateStatus) => {
    appStateRef.current = nextAppState;
    if (nextAppState === 'active' && isAuthenticated && !isLoading && dueWords) {
      updateBadgeDebounced(dueWords.length);
    }
  });

  const handleQueryCacheUpdate = useEffectEvent((newDueWords: StudyWord[] | undefined) => {
    if (newDueWords && appStateRef.current === 'active') {
      updateBadgeDebounced(newDueWords.length);
    }
  });

  // Subscribe once — handler reads latest closure via useEffectEvent.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Subscribe to the due-words query cache; re-subscribe only when user changes.
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const queryKey = fsrsQueries.due(user.id);

    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.query.queryKey === queryKey) {
        handleQueryCacheUpdate(event.query.state.data as StudyWord[] | undefined);
      }
    });

    return () => unsubscribe();
  }, [user?.id, isAuthenticated, queryClient]);
}
