import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
 */
export const useReviewCompletion = (sessionMetrics?: SessionMetrics): void => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Execute completion logic when component mounts
   * Deferred to after animations complete for better UX
   * (The success haptic lives in CompletionScreen's checkmark entering-animation
   * callback so it lands exactly when the zoom-in settles.)
   */
  useEffect(() => {
    const invalidateReviewQueries = async (): Promise<void> => {
      if (!user?.id) return;

      queryClient.setQueryData(fsrsQueries.lastCompletedAtKey(user.id), Date.now());

      try {
        await studyStreakQueries.invalidateAll(queryClient, user.id);
      } catch {
        // Streak refresh is best-effort and must not block completion.
      }

      void fsrsQueries.invalidateAll(queryClient, user.id);
    };

    // (split work + requestIdleCallback) changes *when* this runs, not just its name.
    // These sit in preload/review hot paths; migrating needs per-site profiling.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
    InteractionManager.runAfterInteractions(() => {
      void invalidateReviewQueries();

      if (sessionMetrics) {
        void analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE, {
          wordsReviewed: sessionMetrics.wordsReviewed,
          wordsKnown: sessionMetrics.wordsKnown,
          wordsUnknown: sessionMetrics.wordsUnknown,
          sessionDuration: Date.now() - sessionMetrics.startTime,
          averageStabilityIncrease: sessionMetrics.averageStabilityIncrease,
          longestStreak: sessionMetrics.longestStreak,
          masteredWords: sessionMetrics.masteredWords,
        });
      }

      // Record this session's first-attempt recall for adaptive new-word pacing.
      // Fire-and-forget (best-effort, local storage).
      if (sessionMetrics) {
        void appendSession(sessionMetrics.firstAttemptKnown, sessionMetrics.firstAttemptUnknown);
      }

      // Count completed sessions for the notification priming card's re-ask
      // policy. The OS permission dialog itself is only ever shown from the
      // primed card on the completion screen — never bare from here.
      void recordSessionCompleted();

      // Ad attribution goes LAST and behind its own guard. The Meta SDK threw
      // out of here on the first completion of every launch ("The SDK has not
      // been initialized"), and from the middle of this callback that skipped
      // the two calls above it. Nothing the learner depends on may sit behind
      // an ad SDK.
      if (sessionMetrics) {
        try {
          metaEvents.logPracticeSessionComplete(sessionMetrics.wordsReviewed);
        } catch {
          // Attribution is non-critical — never let it affect the session.
        }
      }
    });
  }, [queryClient, sessionMetrics, user?.id]);
};
