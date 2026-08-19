/**
 * Hook Tests - useEncouragingMetrics
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { STRINGS } from '@/constants/strings';
import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Fix Date.now for deterministic pool selection (dayIndex = 0 → pool[0])
const FIXED_NOW = 0;

describe('useEncouragingMetrics', () => {
  const mockColors: Partial<ThemeColors> = {
    error: '#FF0000',
    warning: '#FFAA00',
    success: '#00FF00',
    info: '#0088FF',
  };

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

  describe('Returns null for invalid inputs', () => {
    test('should return null when sessionMetrics is undefined', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(undefined, mockColors as ThemeColors, 5),
      );
      expect(result.current).toBeNull();
    });

    test('should return null when colors is undefined', () => {
      const { result } = renderHook(() => useEncouragingMetrics(baseMetrics, undefined, 5));
      expect(result.current).toBeNull();
    });

    test('should return null when wordsReviewed is 0', () => {
      const emptyMetrics: SessionMetrics = { ...baseMetrics, wordsReviewed: 0 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(emptyMetrics, mockColors as ThemeColors, 5),
      );
      expect(result.current).toBeNull();
    });
  });

  describe('Traffic light metrics structure', () => {
    test('should return 3 metrics when session duration is 0', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics).toHaveLength(3);
      expect(result.current?.metrics[0].type).toBe('due');
      expect(result.current?.metrics[1].type).toBe('daily_streak');
      expect(result.current?.metrics[2].type).toBe('mastery');
    });

    test('should return 4 metrics including duration when session has elapsed time', () => {
      // startTime 2 minutes ago
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -120000 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(metricsWithDuration, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics).toHaveLength(4);
      expect(result.current?.metrics[0].type).toBe('due');
      expect(result.current?.metrics[1].type).toBe('duration');
      expect(result.current?.metrics[2].type).toBe('daily_streak');
      expect(result.current?.metrics[3].type).toBe('mastery');
    });

    test('should use correct colors for each metric type', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -120000 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(metricsWithDuration, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics[0].color).toBe(mockColors.error);
      expect(result.current?.metrics[1].color).toBe(mockColors.info);
      expect(result.current?.metrics[2].color).toBe(mockColors.warning);
      expect(result.current?.metrics[3].color).toBe(mockColors.success);
    });
  });

  describe('Due words metric (RED)', () => {
    test('should show singular "word" for 1 word reviewed', () => {
      const singleWordMetrics: SessionMetrics = { ...baseMetrics, wordsReviewed: 1 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(singleWordMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[0].text).toBe('1 word reviewed');
    });

    test('should show plural "words" for multiple words reviewed', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[0].text).toBe('5 words reviewed');
    });

    test('should have time icon for due metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[0].icon).toBe('time');
    });
  });

  describe('Duration metric (BLUE)', () => {
    test('should show formatted duration for a 2-minute session', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -120000 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(metricsWithDuration, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[1].text).toBe('2m session');
      expect(result.current?.metrics[1].icon).toBe('hourglass-outline');
    });

    test('should show seconds only for short sessions', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -45000 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(metricsWithDuration, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[1].text).toBe('45s session');
    });

    test('should show minutes and seconds for mixed duration', () => {
      const metricsWithDuration: SessionMetrics = { ...baseMetrics, startTime: -150000 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(metricsWithDuration, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[1].text).toBe('2m 30s session');
    });

    test('should skip duration metric when session duration is 0', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      const durationMetric = result.current?.metrics.find(m => m.type === 'duration');
      expect(durationMetric).toBeUndefined();
    });
  });

  describe('Daily streak metric (YELLOW)', () => {
    test('should show "First session today!" when dailyStreak is 0', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[1].text).toBe('First session today!');
    });

    test('should show "Streak started!" when dailyStreak is 1', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 1),
      );

      expect(result.current?.metrics[1].text).toBe('Streak started!');
    });

    test('should show "X-day streak" when dailyStreak is greater than 1', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 7),
      );

      expect(result.current?.metrics[1].text).toBe('7-day streak');
    });

    test('should have flame icon for streak metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics[1].icon).toBe('flame');
    });
  });

  describe('Mastery metric (GREEN)', () => {
    // Counts the words FSRS actually rewarded — recalled cleanly on the first
    // attempt — not every word the session touched. baseMetrics is 4 clean of 5
    // reviewed, so the miss must not be counted as strengthened.
    test('should show cleanly recalled words strengthened when no words are mastered', () => {
      const noMasteryMetrics: SessionMetrics = {
        ...baseMetrics,
        masteredWords: 0,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(noMasteryMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].text).toBe('4 words strengthened');
      expect(result.current?.metrics[2].icon).toBe('trending-up');
    });

    // A session where nothing was recalled has no strengthened words to report,
    // so the green slot is dropped rather than claiming the whole session.
    // Telling a learner who missed all five that they strengthened five is
    // contradicted by the session they just sat through, and by FSRS, which
    // lowered stability on every one of them.
    test('should omit the strengthened metric when nothing was recalled', () => {
      const noKnownMetrics: SessionMetrics = {
        ...baseMetrics,
        masteredWords: 0,
        wordsKnown: 0,
        wordsUnknown: 5,
        wordsReviewed: 5,
        firstAttemptKnown: 0,
        firstAttemptUnknown: 5,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(noKnownMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics.some(metric => metric.type === 'mastery')).toBe(false);
    });

    test('should show singular "word mastered" for 1 word', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].text).toBe('1 word mastered');
    });

    test('should show plural "words mastered" for multiple words', () => {
      const multiMasteryMetrics: SessionMetrics = { ...baseMetrics, masteredWords: 3 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(multiMasteryMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].text).toBe('3 words mastered');
    });

    test('should have trophy icon for mastery metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].icon).toBe('trophy');
    });
  });

  describe('Contextual educational text', () => {
    test('should return strong pool text when known ratio >= 70%', () => {
      const strongMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 8,
        firstAttemptUnknown: 2,
        wordsReviewed: 10,
        wordsKnown: 8,
        wordsUnknown: 2,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(strongMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_STRONG_POOL[0]);
    });

    test('should return struggle pool text when known ratio < 40%', () => {
      const weakMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 3,
        firstAttemptUnknown: 7,
        wordsReviewed: 10,
        wordsKnown: 3,
        wordsUnknown: 7,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(weakMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_STRUGGLE_POOL[0]);
    });

    test('should return default pool text for moderate performance', () => {
      const moderateMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 5,
        firstAttemptUnknown: 5,
        wordsReviewed: 10,
        wordsKnown: 5,
        wordsUnknown: 5,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(moderateMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_DEFAULT_POOL[0]);
    });

    test('should return perfect session text for flawless session with 5+ words', () => {
      const perfectMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 8,
        firstAttemptUnknown: 0,
        wordsReviewed: 8,
        wordsKnown: 8,
        wordsUnknown: 0,
        longestStreak: 8, // matches wordsReviewed (perfect)
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(perfectMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_PERFECT);
    });

    test('should return big stability jump text when average stability increase is high', () => {
      const bigJumpMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 8,
        firstAttemptUnknown: 2,
        wordsReviewed: 10,
        wordsKnown: 8,
        wordsUnknown: 2,
        averageStabilityIncrease: 4.0,
        longestStreak: 5, // not perfect (5 !== 10)
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(bigJumpMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_BIG_STABILITY_JUMP);
    });

    test('should rotate messages on different days', () => {
      const strongMetrics: SessionMetrics = {
        ...baseMetrics,
        firstAttemptKnown: 8,
        firstAttemptUnknown: 2,
        wordsReviewed: 10,
        wordsKnown: 8,
        wordsUnknown: 2,
      };

      // Day 0 -> pool[0]
      dateNowSpy.mockReturnValue(0);
      const { result: result1 } = renderHook(() =>
        useEncouragingMetrics(strongMetrics, mockColors as ThemeColors, 0),
      );

      // Day 1 -> pool[1]
      dateNowSpy.mockReturnValue(86400000);
      const { result: result2 } = renderHook(() =>
        useEncouragingMetrics(strongMetrics, mockColors as ThemeColors, 0),
      );

      expect(result1.current?.educationalText).toBe(STRINGS.SESSION_ED_STRONG_POOL[0]);
      expect(result2.current?.educationalText).toBe(STRINGS.SESSION_ED_STRONG_POOL[1]);
    });

    test('uses first attempts for recall copy when a missed word is drilled', () => {
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

      const { result } = renderHook(() =>
        useEncouragingMetrics(drilledMetrics, mockColors as ThemeColors, 0),
      );

      // The word was missed and then drilled back. `wordsKnown` counts two
      // recall events for it, but a miss resets stability before the re-ask
      // builds off the lower value — nothing here was strengthened, so the
      // session cannot both read as a struggle and claim a strengthened word.
      expect(result.current?.metrics.some(metric => metric.type === 'mastery')).toBe(false);
      expect(result.current?.educationalText).toBe(STRINGS.SESSION_ED_STRUGGLE_POOL[0]);
    });
  });

  describe('Memoization', () => {
    test('should return same reference when inputs unchanged', () => {
      const { result, rerender } = renderHook(
        ({
          metrics,
          colors,
          streak,
        }: {
          metrics: SessionMetrics;
          colors: ThemeColors;
          streak: number;
        }) => useEncouragingMetrics(metrics, colors, streak),
        {
          initialProps: {
            metrics: baseMetrics,
            colors: mockColors as ThemeColors,
            streak: 5,
          },
        },
      );

      const firstResult = result.current;
      rerender({ metrics: baseMetrics, colors: mockColors as ThemeColors, streak: 5 });
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});
