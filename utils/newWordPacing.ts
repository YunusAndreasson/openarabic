import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  DUE_BACKLOG_ADD_THRESHOLD,
  isCooldownExemptState,
  isSessionCooldownActive,
  NEW_WORD_PACING,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_HOUR, normalizeTimestamp } from '@/utils/dateTimeUtils';
import { isDueAt } from '@/utils/wordClassification';

/**
 * Retention-gated pacing for *new* words. The daily new-word limit the learner
 * sets is treated as a ceiling, not a fixed quota: when recent realised recall
 * slips under the retention the scheduler aims for, the day's allowance eases
 * below that ceiling — down to zero when recall is genuinely struggling — and
 * climbs back to full as recall recovers.
 *
 * Ported from edenmind's `computeAdaptiveNewLimit`. Pure and presentation-
 * agnostic: it takes a recent-window recall reading plus the ceiling/target and
 * returns plain data the daily-limit hook acts on.
 *
 * Limit representation: `Infinity` means "unlimited" (the app's `0` setting maps
 * to this at the call boundary); `0` means "paused"; any finite positive number
 * is the effective cap on words added today.
 */

export type AdaptiveNewLimitStatus =
  /** No finite ceiling and recall is fine — intake is unlimited. */
  | 'unlimited'
  /** Recall is on target — the full configured ceiling is available. */
  | 'full'
  /** Recall is dipping — the allowance is throttled below the ceiling. */
  | 'reduced'
  /** Recall is struggling — no new words today. */
  | 'paused'
  /** Too few recent reviews to judge — the full ceiling stands. */
  | 'warming-up';

export interface RecentRecall {
  /** Realised recall rate over the recent window, in [0, 1]. */
  recall: number;
  /** Number of graded attempts behind that rate. */
  trials: number;
}

export interface AdaptiveNewLimit {
  /** The throttled allowance (`Infinity` = unlimited, `0` = paused). */
  effective: number;
  /** The configured ceiling, echoed back (`Infinity` for unlimited). */
  ceiling: number;
  status: AdaptiveNewLimitStatus;
  /** Recent recall used for the decision; omitted when warming-up. */
  recall?: number;
  /** `desiredRetention - recall`; omitted when warming-up. */
  gap?: number;
}

export interface AdaptiveNewLimitInput {
  /** The configured ceiling: `Infinity` for unlimited, otherwise the number. */
  ceiling: number;
  /** Recent-window recall (realised rate + sample size). */
  recall: RecentRecall;
  /** The recall the schedule aims for (request_retention). */
  desiredRetention: number;
  /** Override the minimum-evidence gate (defaults to NEW_WORD_PACING.MIN_TRIALS). */
  minTrials?: number;
}

/**
 * Resolve today's new-word allowance from the ceiling and recent recall.
 * Branch order matters: the pause gate is checked before the unlimited
 * short-circuit so even an unlimited ceiling pauses when recall is critical.
 */
export function computeAdaptiveNewLimit(input: AdaptiveNewLimitInput): AdaptiveNewLimit {
  const { ceiling, recall, desiredRetention } = input;
  const minTrials = input.minTrials ?? NEW_WORD_PACING.MIN_TRIALS;

  // 1. Not enough evidence yet → never throttle. The full ceiling stands.
  if (recall.trials < minTrials) {
    return { effective: ceiling, ceiling, status: 'warming-up' };
  }

  const gap = desiredRetention - recall.recall;

  // 2. Struggling → pause. Applies to every ceiling, including unlimited.
  if (gap >= NEW_WORD_PACING.PAUSE_GAP) {
    return { effective: 0, ceiling, status: 'paused', recall: recall.recall, gap };
  }

  // 3. Unlimited ceiling, not paused → stays unlimited (no "half of Infinity").
  if (!Number.isFinite(ceiling)) {
    return { effective: Infinity, ceiling, status: 'unlimited', recall: recall.recall, gap };
  }

  // 4. Finite ceiling, recall dipping → ease to roughly half, keep a trickle.
  if (gap >= NEW_WORD_PACING.REDUCE_GAP) {
    return {
      effective: Math.max(1, Math.floor(ceiling / 2)),
      ceiling,
      status: 'reduced',
      recall: recall.recall,
      gap,
    };
  }

  // 5. Recall on target → full ceiling.
  return { effective: ceiling, ceiling, status: 'full', recall: recall.recall, gap };
}

export interface DueBacklogGate {
  blocked: boolean;
  dueCount: number;
}

/**
 * Hard workload gate for new-word intake: while the due backlog is at/above
 * the threshold, adding is blocked until reviews are cleared. Orthogonal to
 * computeAdaptiveNewLimit, which paces intake by recall quality — this one
 * caps it by outstanding workload.
 */
export function evaluateDueBacklogGate(
  dueCount: number,
  threshold: number = DUE_BACKLOG_ADD_THRESHOLD,
): DueBacklogGate {
  return { blocked: dueCount >= threshold, dueCount };
}

export interface FilterDueWordsOptions {
  /** Timestamp (ms) the last practice session finished, if any. */
  lastCompletedAt: number | undefined;
  cooldownHours?: number;
  /** Injected rather than read internally so callers stay pure/testable. */
  nowMs: number;
}

/**
 * Client-side mirror of the server's onlyDue + sessionCooldown filter
 * (`studyWordsFSRSService.getFSRSWords`'s `onlyDue`/`sessionCooldownHours`
 * options) for deriving a due list from an already-cached full word list —
 * the same word list `useFSRSQueries`'s due-query `placeholderData` filters
 * while the dedicated due-words request is still in flight, and what the
 * due-backlog gate falls back to so it can't read the query cache before that
 * request resolves and silently wave new-word adds through. Keep in lockstep
 * with the server-side filter.
 */
export function filterDueWords(
  allWords: StudyWord[],
  { lastCompletedAt, cooldownHours = DEFAULT_SESSION_COOLDOWN_HOURS, nowMs }: FilterDueWordsOptions,
): StudyWord[] {
  const applyCooldown = isSessionCooldownActive(lastCompletedAt, cooldownHours, nowMs);
  const cutoffMs = nowMs - cooldownHours * MILLISECONDS_PER_HOUR;

  return allWords.filter(word => {
    // "Due" itself is `isDueAt` — new words always, otherwise fsrs_due <= now.
    // Only the cooldown below is this function's own.
    if (!isDueAt(word, nowMs)) return false;

    // New words never had a session to cool down from, and Learning /
    // Relearning are exempt by design — the same COOLDOWN_EXEMPT_STATES the
    // server filter in studyWordsFSRSService.getFSRSWords uses, with its
    // rationale there.
    if (!applyCooldown || isCooldownExemptState(word.fsrs_state)) {
      return true;
    }

    const lastStr = normalizeTimestamp(word.fsrs_last_review);
    const lastMs = lastStr ? Date.parse(lastStr) : 0;
    const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
    return !isRecentlyReviewed;
  });
}
