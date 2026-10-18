import { useMemo, useState } from 'react';

import { STRINGS } from '@/constants/strings';
import type { SessionMetrics } from '@/types/review.types';

export interface EncouragingMetric {
  text: string;
  type: 'due' | 'duration' | 'daily_streak' | 'mastery';
}

/** Format session duration into a human-readable string */
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return STRINGS.METRIC_DURATION_SECONDS(seconds);
  if (seconds === 0) return STRINGS.METRIC_DURATION_MINUTES(minutes);
  return STRINGS.METRIC_DURATION_MINUTES_SECONDS(minutes, seconds);
};

/**
 * The rows themselves, kept outside the hook: a plain function the hook memoises,
 * so the STRINGS template calls are ordinary calls rather than render-time ones.
 */
const buildCompletionRows = (
  sessionMetrics: SessionMetrics | undefined,
  dailyStreak: number,
  now: number,
): EncouragingMetric[] | null => {
  if (!sessionMetrics || sessionMetrics.wordsReviewed === 0) {
    return null;
  }

  const metrics = sessionMetrics;
  const rows: EncouragingMetric[] = [];

  // Words reviewed — the session's headline result.
  rows.push({ text: STRINGS.METRIC_WORDS_REVIEWED(metrics.wordsReviewed), type: 'due' });

  const sessionDuration = now - metrics.startTime;
  if (sessionDuration > 0) {
    rows.push({
      text: STRINGS.METRIC_SESSION_DURATION(formatDuration(sessionDuration)),
      type: 'duration',
    });
  }

  rows.push({
    text:
      dailyStreak > 1
        ? STRINGS.METRIC_DAY_STREAK(dailyStreak)
        : dailyStreak === 1
          ? STRINGS.METRIC_STREAK_STARTED
          : STRINGS.METRIC_FIRST_SESSION_TODAY,
    type: 'daily_streak',
  });

  if (metrics.masteredWords > 0) {
    rows.push({ text: STRINGS.METRIC_WORDS_MASTERED(metrics.masteredWords), type: 'mastery' });
  } else if (metrics.firstAttemptKnown > 0) {
    // `firstAttemptKnown` — the words whose stability actually went UP.
    //
    // The other two candidates both say something untrue. `wordsReviewed`
    // counts the misses as strengthened: a learner who recalled 3 of 12 was
    // told they strengthened 12, and a session with nothing recalled still
    // claimed the full count. `wordsKnown` counts recall EVENTS, not words, so
    // a single word missed and then drilled reads as "2 words strengthened" —
    // and that word is not strengthened either way, because a miss resets its
    // stability before the re-ask builds back off the lower value.
    //
    // What remains is the set of words recalled cleanly on the first attempt,
    // which is unique per word and is exactly the set FSRS rewarded.
    //
    // Guarded rather than an unconditional else: with nothing cleanly recalled
    // there is no true number for a "strengthened" row, so the row is dropped
    // instead of filled with a zero.
    rows.push({
      text: STRINGS.METRIC_WORDS_IMPROVING(metrics.firstAttemptKnown),
      type: 'mastery',
    });
  }

  return rows;
};

/**
 * The completion screen's rows: what the session measured, in plain words.
 * Words reviewed → duration → daily streak → words mastered (or strengthened).
 *
 * Every row is a count, so every row is true. The paragraph that used to sit
 * under the title is gone: its pools ("Some of these words won't need review
 * for weeks", "Some jumped from days to weeks between reviews") were picked by
 * recall ratio and asserted intervals nothing computed. Nothing here assigns a
 * colour or an icon either — the rows are one ink, and that decision belongs to
 * the screen.
 *
 * Returns `null` when there is nothing to report (no session, or a session in
 * which no word was reviewed).
 *
 * @param sessionMetrics - Metrics from the completed session
 * @param dailyStreak - Current daily study streak (0 if none)
 */
export const useEncouragingMetrics = (
  sessionMetrics: SessionMetrics | undefined,
  dailyStreak: number = 0,
): EncouragingMetric[] | null => {
  // Capture the "now" timestamp once when the completion view mounts so the
  // session duration stays stable across re-renders.
  const [now] = useState(() => Date.now());

  return useMemo(
    () => buildCompletionRows(sessionMetrics, dailyStreak, now),
    [sessionMetrics, dailyStreak, now],
  );
};
