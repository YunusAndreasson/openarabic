import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { ensurePermissions } from '@/services/notificationService';
import type { SessionMetrics } from '@/types/review.types';
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
  }, [sessionMetrics]);

  /**
   * Execute completion logic when component mounts
   * Deferred to after animations complete for better UX
   * (The success haptic lives in CompletionScreen's checkmark entering-animation
   * callback so it lands exactly when the zoom-in settles.)
   */
  useEffect(() => {
    if (!shouldExecute) return;

    InteractionManager.runAfterInteractions(() => {
      invalidateReviewQueries();
      trackCompletion();

      // Record this session's first-attempt recall for adaptive new-word pacing.
      // Fire-and-forget (best-effort, local storage).
      if (sessionMetrics) {
        void appendSession(sessionMetrics.firstAttemptKnown, sessionMetrics.firstAttemptUnknown);
      }

      // Ask for notification/badge permission at this high-intent moment (the user
      // just practiced; words they reviewed will come due later) so the home-screen
      // icon badge — the due-words count — and study reminders can show. Idempotent:
      // ensurePermissions() only surfaces the OS prompt when status is undetermined,
      // and the OS shows it at most once.
      void ensurePermissions();
    });
  }, [shouldExecute, invalidateReviewQueries, trackCompletion, sessionMetrics]);

  return {
    invalidateReviewQueries,
    trackCompletion,
  };
};
