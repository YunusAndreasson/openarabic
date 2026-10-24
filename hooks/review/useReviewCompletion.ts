import { useEffect } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import type { SessionMetrics } from '@/types/review.types';
import { recordSessionCompleted } from '@/utils/notificationPromptStorage';
import { appendSession } from '@/utils/recallSignalStorage';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { recordStudyDay } from '@/utils/studyDayLedger';

/**
 * Hook to handle review session completion side effects: analytics and the
 * learner's local ledgers.
 *
 * The query caches are deliberately not touched here. useReview's
 * finalizeSession stamps the completion and refreshes the streak and the FSRS
 * lists once per session, after the session's writes have settled — and for a
 * session that ran out of cards it does so as this screen mounts. Doing it here
 * as well ran every refresh twice on a natural finish, the first time racing
 * the last grade's write.
 *
 * @param sessionMetrics - Optional metrics from the completed session
 */
export const useReviewCompletion = (sessionMetrics?: SessionMetrics): void => {
  /**
   * Execute completion logic when component mounts
   * Deferred to after animations complete for better UX
   * (The success haptic lives in CompletionScreen's checkmark entering-animation
   * callback so it lands exactly when the zoom-in settles.)
   */
  useEffect(() => {
    // Mounting a completion surface without any reviewed words must be a
    // no-op. Nothing was graded, so there is no session to report and no day
    // to record.
    if (!sessionMetrics || sessionMetrics.wordsReviewed <= 0) return;

    runWhenIdle(() => {
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
  }, [sessionMetrics]);
};
