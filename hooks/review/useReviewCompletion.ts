import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import type { SessionMetrics } from '@/types/review.types';
import { recordSessionCompleted } from '@/utils/notificationPromptStorage';
import { appendSession } from '@/utils/recallSignalStorage';

/**
 * Hook to handle review session completion side effects
 * Manages query invalidation and analytics tracking
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
    queryClient.setQueryData(fsrsQueries.lastCompletedAtKey(user.id), Date.now());

    // Invalidate study streak queries to update UI immediately (silent - don't block on failure)
    try {
      await studyStreakQueries.invalidateAll(queryClient, user.id);
    } catch {
      // Silently fail - don't block review completion on streak recording failure
    }

    // Invalidate all FSRS word queries (prefix-based — covers all, due, stats, allWithCooldown)
    fsrsQueries.invalidateAll(queryClient, user.id);
  }, [user, queryClient]);

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

    metaEvents.logPracticeSessionComplete(sessionMetrics.wordsReviewed);
  }, [sessionMetrics]);

  /**
   * Execute completion logic when component mounts
   * Deferred to after animations complete for better UX
   * (The success haptic lives in CompletionScreen's checkmark entering-animation
   * callback so it lands exactly when the zoom-in settles.)
   */
  useEffect(() => {
    if (!shouldExecute) return;

    // (split work + requestIdleCallback) changes *when* this runs, not just its name.
    // These sit in preload/review hot paths; migrating needs per-site profiling.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
    InteractionManager.runAfterInteractions(() => {
      invalidateReviewQueries();
      trackCompletion();

      // Record this session's first-attempt recall for adaptive new-word pacing.
      // Fire-and-forget (best-effort, local storage).
      if (sessionMetrics) {
        void appendSession(sessionMetrics.firstAttemptKnown, sessionMetrics.firstAttemptUnknown);
      }

      // Count completed sessions for the notification priming card's re-ask
      // policy. The OS permission dialog itself is only ever shown from the
      // primed card on the completion screen — never bare from here.
      void recordSessionCompleted();
    });
  }, [shouldExecute, invalidateReviewQueries, trackCompletion, sessionMetrics]);

  return {
    invalidateReviewQueries,
    trackCompletion,
  };
};
