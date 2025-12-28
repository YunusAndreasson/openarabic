import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_BASE_KEY } from '@/constants/fsrs';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import type { SessionMetrics } from '@/types/review.types';
import { successFeedback } from '@/utils/haptics';

/**
 * Hook to handle review session completion side effects
 * Manages query invalidation, analytics tracking, and haptic feedback
 *
 * @param sessionMetrics - Optional metrics from the completed session
 * @param shouldExecute - Whether to execute completion logic (default: true)
 */
export const useReviewCompletion = (
  sessionMetrics?: SessionMetrics,
  shouldExecute: boolean = true,
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Invalidate all FSRS queries after review completion
   * This ensures the study tab and coach messages update immediately
   * Also records study session for streak tracking
   */
  const invalidateReviewQueries = useCallback(async () => {
    if (!user?.id) return;

    // Mark session completion time to enable temporary cooldown
    queryClient.setQueryData([FSRS_BASE_KEY, user.id, 'lastCompletedAt'], Date.now());

    // Invalidate study streak queries to update UI immediately (silent - don't block on failure)
    try {
      await studyStreakQueries.invalidateAll(queryClient, user.id);
    } catch {
      // Silently fail - don't block review completion on streak recording failure
    }

    // Invalidate all FSRS word queries
    queryClient.invalidateQueries({
      predicate: query => {
        // FIXED: Add null check for robustness
        const key = query.queryKey?.[0];
        return typeof key === 'string' && (key === 'fsrs-words' || key === 'struggling-words');
      },
    });

    // Specifically invalidate the queries used by the study tab
    const queriesToInvalidate = [
      fsrsQueries.all(user.id).queryKey,
      fsrsQueries.due(user.id).queryKey,
      fsrsQueries.stats(user.id).queryKey,
      fsrsQueries.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS).queryKey,
    ] as const;

    queriesToInvalidate.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [user?.id, queryClient]);

  /**
   * Track review completion analytics
   */
  const trackCompletion = useCallback(() => {
    if (!sessionMetrics) return;

    const sessionDuration = Date.now() - sessionMetrics.startTime;

    analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE, {
      wordsReviewed: sessionMetrics.wordsReviewed,
      wordsKnown: sessionMetrics.wordsKnown,
      wordsUnknown: sessionMetrics.wordsUnknown,
      sessionDuration,
      averageStabilityIncrease: sessionMetrics.averageStabilityIncrease,
      longestStreak: sessionMetrics.longestStreak,
      masteredWords: sessionMetrics.masteredWords,
    });
  }, [sessionMetrics]);

  /**
   * Execute completion logic when component mounts
   * Deferred to after animations complete for better UX
   */
  useEffect(() => {
    if (!shouldExecute) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    InteractionManager.runAfterInteractions(() => {
      invalidateReviewQueries();
      trackCompletion();

      // Trigger haptic feedback after animations
      timeoutId = setTimeout(
        () => {
          successFeedback();
        },
        TIMING_CONFIG.FAST.duration + TIMING_CONFIG.ENTRANCE.duration / 2,
      );
    });

    // FIXED: Cleanup timeout on unmount to prevent haptic feedback on wrong screen
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldExecute, invalidateReviewQueries, trackCompletion]);

  return {
    invalidateReviewQueries,
    trackCompletion,
  };
};
