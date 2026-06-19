/**
 * Within-session "drill" policy — the layer FSRS deliberately doesn't own.
 *
 * FSRS schedules the *next* session (day-scale) and already drops a missed word
 * into Relearning with a stability penalty. What it does NOT decide is how a
 * focused, sparse review queue is *ordered within one sitting*. This small,
 * position-based policy sits on top, grounded in memory science (NOT reinventing
 * FSRS's scheduling):
 *  - Massed repetition is worst — never re-show a miss immediately; leave a short
 *    lag of intervening retrievals so recall is effortful, not a reread.
 *  - Successive relearning to a criterion (Rawson & Dunlosky) — drill a missed
 *    word until it's recalled correctly a couple of times, then let FSRS space it.
 *  - Expanding lag — widen the gap after each success.
 *  - A cap — a stubborn word leaves with its FSRS Relearning state rather than
 *    trapping the learner in an endless drill.
 *
 * Ported verbatim (in spirit) from edenmind's review-drill. Pure + immutable so
 * it's unit-testable; `useFSRS` owns the queue splice and persistence, this owns
 * only the decision. Tuning constants live in constants/fsrs.ts.
 */

import {
  DRILL_CRITERION,
  DRILL_LAG_AFTER_CORRECT,
  DRILL_LAG_AFTER_MISS,
  DRILL_MAX_REASKS,
} from '@/constants/fsrs';

export interface DrillProgress {
  /** Consecutive correct recalls since the last miss (counts toward the criterion). */
  correctStreak: number;
  /** How many times this word has been reinserted this session (the cap). */
  reasks: number;
}

export interface DrillPolicy {
  /** Correct recalls (each after a lag) required to graduate a *missed* word. */
  criterion: number;
  /** Intervening cards before the first re-ask after a miss (short — drill it). */
  lagAfterMiss: number;
  /** Intervening cards before the next re-ask after a non-graduating correct recall. */
  lagAfterCorrect: number;
  /** Hard cap on reinsertions per word per session, so a stuck word can't trap. */
  maxReasks: number;
}

/** Built from constants/fsrs.ts so tuning lives with the other SRS constants. */
export const DEFAULT_DRILL_POLICY: DrillPolicy = {
  criterion: DRILL_CRITERION,
  lagAfterMiss: DRILL_LAG_AFTER_MISS,
  lagAfterCorrect: DRILL_LAG_AFTER_CORRECT,
  maxReasks: DRILL_MAX_REASKS,
};

export interface DrillDecision {
  /** Whether to reinsert the word into the session queue for another pass. */
  requeue: boolean;
  /** Intervening cards before the re-ask (only meaningful when `requeue`). */
  lag: number;
  /** The word's updated drill progress, or null to stop tracking / graduate it. */
  next: DrillProgress | null;
}

/**
 * Decide what a graded answer does to the within-session drill: whether to
 * re-ask the word, after how many intervening cards, and its new progress.
 *
 * `prior` is the word's existing progress this session (null = not missed yet).
 * `missed` is true when the answer was "Unknown" (the only miss in the binary
 * grade model).
 */
export function decideDrill(
  prior: DrillProgress | null,
  missed: boolean,
  policy: DrillPolicy = DEFAULT_DRILL_POLICY,
): DrillDecision {
  // Never missed and recalled correctly → it just graduates, no drilling.
  if (!missed && !prior) return { requeue: false, lag: 0, next: null };

  const reasks = prior?.reasks ?? 0;
  // Cap reached → stop drilling; it leaves with its FSRS Relearning state and
  // returns next session, so a stubborn word can't trap the learner.
  if (reasks >= policy.maxReasks) return { requeue: false, lag: 0, next: null };

  if (missed) {
    // Reset the streak and re-ask soon — effortful, but not a massed reread.
    return {
      requeue: true,
      lag: policy.lagAfterMiss,
      next: { correctStreak: 0, reasks: reasks + 1 },
    };
  }

  // Correct recall of a word still being drilled.
  const correctStreak = (prior?.correctStreak ?? 0) + 1;
  if (correctStreak >= policy.criterion) {
    // Criterion met — graduate out of the session (FSRS owns the next interval).
    return { requeue: false, lag: 0, next: null };
  }
  // Not yet — re-ask again at the wider, expanded lag.
  return {
    requeue: true,
    lag: policy.lagAfterCorrect,
    next: { correctStreak, reasks: reasks + 1 },
  };
}
