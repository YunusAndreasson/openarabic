import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import type { SessionMetrics } from '@/types/review.types';
import { recordSessionCompleted } from '@/utils/notificationPromptStorage';
import { appendSession } from '@/utils/recallSignalStorage';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { recordStudyDay } from '@/utils/studyDayLedger';

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
    // Mounting a completion surface without any reviewed words must be a
    // no-op — including the cache work. Nothing was graded, so no server state
    // changed and there is nothing stale to refresh; setting the
    // last-completed stamp would additionally start the session cooldown for a
    // session that never happened.
    if (!sessionMetrics || sessionMetrics.wordsReviewed <= 0) return;

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

    runWhenIdle(() => {
      void invalidateReviewQueries();

      void analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE, {
        wordsReviewed: sessionMetrics.wordsReviewed,
        wordsKnown: sessionMetrics.wordsKnown,
        wordsUnknown: sessionMetrics.wordsUnknown,
        sessionDuration: Date.now() - sessionMetrics.startTime,
        averageStabilityIncrease: sessionMetrics.averageStabilityIncrease,
        longestStreak: sessionMetrics.longestStreak,
        masteredWords: sessionMetrics.masteredWords,
      });

      // Record this session's first-attempt recall for adaptive new-word pacing.
      // Fire-and-forget (best-effort, local storage).
      void appendSession(sessionMetrics.firstAttemptKnown, sessionMetrics.firstAttemptUnknown);

      // Stamp today into the append-only study-day ledger. The server cannot
      // remember this: `fsrs_last_review` is overwritten by the next review, so
      // the day-key set derived from it loses days as the learner keeps going.
      // Gated on a word actually being reviewed, matching the `fsrs_reps > 0`
      // rule the derived set uses — opening and closing a session must not
      // count as a study day.
      void recordStudyDay();

      // Count completed sessions for the notification priming card's re-ask
      // policy. The OS permission dialog itself is only ever shown from the
      // primed card on the completion screen — never bare from here.
      void recordSessionCompleted();

      // Ad attribution goes LAST and behind its own guard. The Meta SDK threw
      // out of here on the first completion of every launch ("The SDK has not
      // been initialized"), and from the middle of this callback that skipped
      // the two calls above it. Nothing the learner depends on may sit behind
      // an ad SDK.
      try {
        metaEvents.logPracticeSessionComplete(sessionMetrics.wordsReviewed);
      } catch {
        // Attribution is non-critical — never let it affect the session.
      }
    });
  }, [queryClient, sessionMetrics, user?.id]);
};
