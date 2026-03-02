/**
 * Hook Tests - useEncouragingMetrics
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';

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
  };

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

      expect(result.current).toHaveLength(3);
      expect(result.current?.[0].type).toBe('due');
      expect(result.current?.[1].type).toBe('daily_streak');
      expect(result.current?.[2].type).toBe('mastery');
    });

    test('should use correct colors for each metric type', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.[0].color).toBe(mockColors.error);
      expect(result.current?.[1].color).toBe(mockColors.warning);
      expect(result.current?.[2].color).toBe(mockColors.success);
    });
  });

  describe('Due words metric (RED)', () => {
    test('should show singular "word" for 1 word reviewed', () => {
      const singleWordMetrics: SessionMetrics = { ...baseMetrics, wordsReviewed: 1 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(singleWordMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[0].text).toBe('1 word reviewed');
    });

    test('should show plural "words" for multiple words reviewed', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[0].text).toBe('5 words reviewed');
    });

    test('should have time icon for due metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[0].icon).toBe('time');
    });
  });

  describe('Daily streak metric (YELLOW)', () => {
    test('should show "Practice tomorrow for a streak" when dailyStreak is 0', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[1].text).toBe('Practice tomorrow for a streak');
    });

    test('should show "Streak started!" when dailyStreak is 1', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 1),
      );

      expect(result.current?.[1].text).toBe('Streak started!');
    });

    test('should show "X-day streak" when dailyStreak is greater than 1', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 7),
      );

      expect(result.current?.[1].text).toBe('7-day streak');
    });

    test('should have flame icon for streak metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 5),
      );

      expect(result.current?.[1].icon).toBe('flame');
    });
  });

  describe('Mastery metric (GREEN)', () => {
    test('should show "Building toward mastery" when no words mastered', () => {
      const noMasteryMetrics: SessionMetrics = { ...baseMetrics, masteredWords: 0 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(noMasteryMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[2].text).toBe('Building toward mastery');
    });

    test('should show singular "word mastered" for 1 word', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[2].text).toBe('1 word mastered');
    });

    test('should show plural "words mastered" for multiple words', () => {
      const multiMasteryMetrics: SessionMetrics = { ...baseMetrics, masteredWords: 3 };
      const { result } = renderHook(() =>
        useEncouragingMetrics(multiMasteryMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[2].text).toBe('3 words mastered');
    });

    test('should have trophy icon for mastery metric', () => {
      const { result } = renderHook(() =>
        useEncouragingMetrics(baseMetrics, mockColors as ThemeColors, 0),
      );

      expect(result.current?.[2].icon).toBe('trophy');
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
