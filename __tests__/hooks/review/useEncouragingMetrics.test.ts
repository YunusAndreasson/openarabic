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
  };

  const baseMetrics: SessionMetrics = {
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
    test('should return exactly 3 metrics in traffic light order', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics).toHaveLength(3);
      expect(result.current?.metrics[0].type).toBe('due');
      expect(result.current?.metrics[1].type).toBe('daily_streak');
      expect(result.current?.metrics[2].type).toBe('mastery');
    });

    test('should use correct colors for each metric type', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.metrics[0].color).toBe(mockColors.error);
      expect(result.current?.metrics[1].color).toBe(mockColors.warning);
      expect(result.current?.metrics[2].color).toBe(mockColors.success);
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
    test('should show words strengthened when no words mastered but some known', () => {
      const noMasteryMetrics: SessionMetrics = {
        ...baseMetrics,
        masteredWords: 0,
        wordsKnown: 4,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(noMasteryMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].text).toBe('4 words strengthened');
      expect(result.current?.metrics[2].icon).toBe('trending-up');
    });

    test('should show words strengthened with total count when none known', () => {
      const noKnownMetrics: SessionMetrics = {
        ...baseMetrics,
        masteredWords: 0,
        wordsKnown: 0,
        wordsReviewed: 5,
      };
      const { result } = renderHook(() =>
        useEncouragingMetrics(noKnownMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.metrics[2].text).toBe('5 words strengthened');
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
  });

  describe('Memoization', () => {
    test('should return same reference when inputs unchanged', () => {
      const { result, rerender } = renderHook(
        ({ metrics, colors, streak }) => useEncouragingMetrics(metrics, colors, streak),
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
