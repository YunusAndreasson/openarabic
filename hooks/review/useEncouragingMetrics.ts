import type { Ionicons } from '@/components/ui';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';

import { STRINGS } from '@/constants/strings';
import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';

export interface EncouragingMetric {
  text: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  type: 'due' | 'duration' | 'daily_streak' | 'mastery';
}

export interface EncouragingMetricsResult {
  metrics: EncouragingMetric[];
  educationalText: string;
}

/** Format session duration into a human-readable string */
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

function selectDailyMessage(pool: readonly [string, ...string[]], dayIndex: number): string {
  return pool[dayIndex % pool.length] ?? pool[0];
}

/**
 * Build an array of encouraging metric objects for the review completion screen.
 * Shows up to 4 metrics:
 * Red (Due) → Blue (Duration) → Yellow (Streak) → Green (Mastered)
 *
 * Also returns contextual educational text based on session performance.
 *
 * @param sessionMetrics - Metrics from the completed session
 * @param colors - Theme colors
 * @param dailyStreak - Current daily study streak (0 if none)
 */
export const useEncouragingMetrics = (
  sessionMetrics: SessionMetrics | undefined,
  colors: ThemeColors | undefined,
  dailyStreak: number = 0,
): EncouragingMetricsResult | null => {
  // Capture the "now" timestamp once when the completion view mounts so the
  // session duration and day-rotation index stay stable across re-renders.
  const [now] = useState(() => Date.now());

  return useMemo(() => {
    if (!sessionMetrics || !colors || sessionMetrics.wordsReviewed === 0) {
      return null;
    }

    const metrics = sessionMetrics;
    const firstAttemptTotal = metrics.firstAttemptKnown + metrics.firstAttemptUnknown;
    const knownRatio = firstAttemptTotal > 0 ? metrics.firstAttemptKnown / firstAttemptTotal : 0;

    // Traffic light metrics (always show these 3 in order)
    const trafficLightMetrics: EncouragingMetric[] = [];

    // Words reviewed — the session's headline result, so it takes the brand
    // tint. It was the error red with a clock, which on a screen titled
    // "Session complete" read as a warning about the thing just achieved.
    const wordText = metrics.wordsReviewed === 1 ? 'word' : 'words';
    trafficLightMetrics.push({
      text: `${metrics.wordsReviewed} ${wordText} reviewed`,
      icon: 'checkmark-done',
      color: colors.tint,
      type: 'due',
    });

    // 🔵 BLUE - Session duration
    const sessionDuration = now - metrics.startTime;
    if (sessionDuration > 0) {
      trafficLightMetrics.push({
        text: `${formatDuration(sessionDuration)} session`,
        icon: 'hourglass-outline',
        color: colors.info,
        type: 'duration',
      });
    }

    // 🟡 YELLOW - Daily study streak
    if (dailyStreak > 1) {
      trafficLightMetrics.push({
        text: `${dailyStreak}-day streak`,
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    } else if (dailyStreak === 1) {
      trafficLightMetrics.push({
        text: 'Streak started!',
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    } else {
      trafficLightMetrics.push({
        text: STRINGS.METRIC_FIRST_SESSION_TODAY,
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    }

    // 🟢 GREEN - Mastered words or progress indicator
    if (metrics.masteredWords > 0) {
      const masteredText = metrics.masteredWords === 1 ? 'word' : 'words';
      trafficLightMetrics.push({
        text: `${metrics.masteredWords} ${masteredText} mastered`,
        icon: 'trophy',
        color: colors.success,
        type: 'mastery',
      });
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
      // there is no true number for a green "strengthened" slot, so the slot is
      // dropped instead of filled with a zero. The educational line below
      // already speaks to a hard session.
      trafficLightMetrics.push({
        text: STRINGS.METRIC_WORDS_IMPROVING(metrics.firstAttemptKnown),
        icon: 'trending-up',
        color: colors.success,
        type: 'mastery',
      });
    }

    // Contextual educational text based on performance
    // Day-based rotation for variety (same message all day, different tomorrow).
    // Counted in LOCAL days: `now / 86400000` alone flips at UTC midnight —
    // mid-evening in the Americas, so two sessions an hour apart got different
    // "messages of the day".
    const dayIndex = Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);

    let educationalText: string;

    // Contextual overrides checked first (special session achievements)
    // Every word recalled on its first attempt, over a session long enough for
    // that to mean something. `firstAttemptKnown + firstAttemptUnknown` is
    // `wordsReviewed` by construction (useSessionMetrics increments them in the
    // same branch), so this one equality already implies both
    // `firstAttemptUnknown === 0` and `knownRatio === 1` — they were spelled out
    // as separate clauses and read as independent checks when they cannot fail
    // on their own.
    if (metrics.firstAttemptKnown === metrics.wordsReviewed && metrics.wordsReviewed >= 5) {
      educationalText = STRINGS.SESSION_ED_PERFECT;
    } else if (knownRatio >= 0.7 && metrics.averageStabilityIncrease >= 3.0) {
      educationalText = STRINGS.SESSION_ED_BIG_STABILITY_JUMP;
    } else if (knownRatio >= 0.7) {
      educationalText = selectDailyMessage(STRINGS.SESSION_ED_STRONG_POOL, dayIndex);
    } else if (knownRatio < 0.4) {
      educationalText = selectDailyMessage(STRINGS.SESSION_ED_STRUGGLE_POOL, dayIndex);
    } else {
      educationalText = selectDailyMessage(STRINGS.SESSION_ED_DEFAULT_POOL, dayIndex);
    }

    return { metrics: trafficLightMetrics, educationalText };
  }, [sessionMetrics, colors, dailyStreak, now]);
};
