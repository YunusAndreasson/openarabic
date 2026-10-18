/**
 * Hook Tests - useEncouragingMetrics
 *
 * The completion screen's rows. Every row is something the session measured;
 * the hook assigns no colour and no icon (the screen renders them in one ink),
 * and there is no encouragement paragraph — its pools asserted intervals that
 * nothing computed.
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - renderHook from @testing-library/react-native
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { STRINGS } from '@/constants/strings';
import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import type { SessionMetrics } from '@/types/review.types';

const FIXED_NOW = 0;

describe('useEncouragingMetrics', () => {
  const baseMetrics: SessionMetrics = {
    firstAttemptKnown: 4,
    firstAttemptUnknown: 1,
    wordsReviewed: 5,
    wordsKnown: 4,
    wordsUnknown: 1,
    averageStabilityIncrease: 1.5,
    longestStreak: 3,
    currentStreak: 2,
    masteredWords: 1,
    startTime: FIXED_NOW,
  };

  let dateNowSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('Returns null when there is nothing to report', () => {
    test('should return null when sessionMetrics is undefined', () => {
      const { result } = renderHook(() => useEncouragingMetrics(undefined, 5));
      expect(result.current).toBeNull();
    });

    test('should return null when wordsReviewed is 0', () => {
      const emptyMetrics: SessionMetrics = { ...baseMetrics, wordsReviewed: 0 };
      const { result } = renderHook(() => useEncouragingMetrics(emptyMetrics, 5));
      expect(result.current).toBeNull();
    });
  });

  describe('Row structure', () => {
    test('should return 3 rows when session duration is 0', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 5));

      expect(result.current?.map(row => row.type)).toEqual(['due', 'daily_streak', 'mastery']);
    });

    test('should return 4 rows including duration when session has elapsed time', () => {
      // startTime 2 minutes ago
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -120000 };
      const { result } = renderHook(() => useEncouragingMetrics(metricsWithDuration, 5));

      expect(result.current?.map(row => row.type)).toEqual([
        'due',
        'duration',
        'daily_streak',
        'mastery',
      ]);
    });

    // One ink: the rows used to carry a hue and an icon each (a rainbow of
    // tinted squares). What a row looks like is the screen's decision.
    test('rows carry text and kind only — no colour, no icon', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 5));

      for (const row of result.current ?? []) {
        expect(Object.keys(row).sort()).toEqual(['text', 'type']);
      }
    });
  });

  describe('Words reviewed', () => {
    test('should show singular "word" for 1 word reviewed', () => {
      const singleWordMetrics: SessionMetrics = { ...baseMetrics, wordsReviewed: 1 };
      const { result } = renderHook(() => useEncouragingMetrics(singleWordMetrics, 0));

      expect(result.current?.[0]?.text).toBe('1 word reviewed');
    });

    test('should show plural "words" for multiple words reviewed', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 0));

      expect(result.current?.[0]?.text).toBe(STRINGS.METRIC_WORDS_REVIEWED(5));
      expect(result.current?.[0]?.text).toBe('5 words reviewed');
    });
  });

  describe('Duration', () => {
    test('should show formatted duration for a 2-minute session', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -120000 };
      const { result } = renderHook(() => useEncouragingMetrics(metricsWithDuration, 0));

      expect(result.current?.[1]?.text).toBe('2m session');
    });

    test('should show seconds only for short sessions', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -45000 };
      const { result } = renderHook(() => useEncouragingMetrics(metricsWithDuration, 0));

      expect(result.current?.[1]?.text).toBe('45s session');
    });

    test('should show minutes and seconds for mixed duration', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -150000 };
      const { result } = renderHook(() => useEncouragingMetrics(metricsWithDuration, 0));

      expect(result.current?.[1]?.text).toBe('2m 30s session');
    });

    test('should skip the duration row when session duration is 0', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 0));

      expect(result.current?.find(row => row.type === 'duration')).toBeUndefined();
    });
  });

  describe('Daily streak', () => {
    test('should say it is the first session today when dailyStreak is 0', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 0));

      expect(result.current?.[1]?.text).toBe(STRINGS.METRIC_FIRST_SESSION_TODAY);
    });

    test('should say the streak started when dailyStreak is 1', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 1));

      expect(result.current?.[1]?.text).toBe(STRINGS.METRIC_STREAK_STARTED);
    });

    test('should show "X-day streak" when dailyStreak is greater than 1', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 7));

      expect(result.current?.[1]?.text).toBe('7-day streak');
    });
  });

  describe('Mastered / strengthened', () => {
    // Counts the words FSRS actually rewarded — recalled cleanly on the first
    // attempt — not every word the session touched. baseMetrics is 4 clean of 5
    // reviewed, so the miss must not be counted as strengthened.
    test('should show cleanly recalled words strengthened when no words are mastered', () => {
      const noMasteryMetrics: SessionMetrics = { ...baseMetrics, masteredWords: 0 };
      const { result } = renderHook(() => useEncouragingMetrics(noMasteryMetrics, 0));

      expect(result.current?.[2]?.text).toBe('4 words strengthened');
    });

    // A session where nothing was recalled has no strengthened words to report,
    // so the row is dropped rather than claiming the whole session. Telling a
    // learner who missed all five that they strengthened five is contradicted
    // by the session they just sat through, and by FSRS, which lowered
    // stability on every one of them.
    test('should omit the strengthened row when nothing was recalled', () => {
      const noKnownMetrics: SessionMetrics = {
        ...baseMetrics,
        masteredWords: 0,
        wordsKnown: 0,
        wordsUnknown: 5,
        wordsReviewed: 5,
        firstAttemptKnown: 0,
        firstAttemptUnknown: 5,
      };
      const { result } = renderHook(() => useEncouragingMetrics(noKnownMetrics, 0));

      expect(result.current?.some(row => row.type === 'mastery')).toBe(false);
    });

    // The word was missed and then drilled back. `wordsKnown` counts two recall
    // events for it, but a miss resets stability before the re-ask builds off
    // the lower value — nothing here was strengthened.
    test('does not count a missed-then-drilled word as strengthened', () => {
      const drilledMetrics: SessionMetrics = {
        ...baseMetrics,
        wordsReviewed: 1,
        wordsKnown: 2,
        wordsUnknown: 1,
        firstAttemptKnown: 0,
        firstAttemptUnknown: 1,
        masteredWords: 0,
        longestStreak: 2,
      };
      const { result } = renderHook(() => useEncouragingMetrics(drilledMetrics, 0));

      expect(result.current?.some(row => row.type === 'mastery')).toBe(false);
    });

    test('should show singular "word mastered" for 1 word', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, 0));

      expect(result.current?.[2]?.text).toBe('1 word mastered');
    });

    test('should show plural "words mastered" for multiple words', () => {
      const multiMasteryMetrics: SessionMetrics = { ...baseMetrics, masteredWords: 3 };
      const { result } = renderHook(() => useEncouragingMetrics(multiMasteryMetrics, 0));

      expect(result.current?.[2]?.text).toBe('3 words mastered');
    });
  });

  describe('Memoization', () => {
    test('should return same reference when inputs unchanged', () => {
      const { result, rerender } = renderHook(
        ({ metrics, streak }: { metrics: SessionMetrics; streak: number }) =>
          useEncouragingMetrics(metrics, streak),
        { initialProps: { metrics: baseMetrics, streak: 5 } },
      );

      const firstResult = result.current;
      rerender({ metrics: baseMetrics, streak: 5 });

      expect(result.current).toBe(firstResult);
    });
  });
});
