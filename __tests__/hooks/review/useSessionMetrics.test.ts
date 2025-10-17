import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useSessionMetrics } from './useSessionMetrics';

describe('useSessionMetrics', () => {
  describe('Basic metric updates', () => {
    it('should track known responses correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', 5.0);
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 1,
        wordsKnown: 1,
        wordsVague: 0,
        wordsUnknown: 0,
        currentStreak: 1,
        longestStreak: 1,
        masteredWords: 1, // stability >= 4
      });
    });

    it('should track vague responses correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('vague', 5.0);
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 1,
        wordsKnown: 0,
        wordsVague: 1,
        wordsUnknown: 0,
        currentStreak: 0, // Reset on vague
        longestStreak: 0,
        masteredWords: 0, // Only counts on known
      });
    });

    it('should track unknown responses correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('unknown', 5.0);
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 1,
        wordsKnown: 0,
        wordsVague: 0,
        wordsUnknown: 1,
        currentStreak: 0, // Reset on unknown
        longestStreak: 0,
        masteredWords: 0, // Only counts on known
      });
    });
  });

  describe('Streak logic', () => {
    it('should preserve longest streak when current streak resets', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Build up streak
      act(() => {
        result.current.updateMetrics('known', 5.0);
        result.current.updateMetrics('known', 5.0);
        result.current.updateMetrics('known', 5.0);
      });

      expect(result.current.metrics.currentStreak).toBe(3);
      expect(result.current.metrics.longestStreak).toBe(3);

      // Reset with vague
      act(() => {
        result.current.updateMetrics('vague', 5.0);
      });

      expect(result.current.metrics.currentStreak).toBe(0);
      expect(result.current.metrics.longestStreak).toBe(3); // Preserved

      // Start new streak
      act(() => {
        result.current.updateMetrics('known', 5.0);
      });

      expect(result.current.metrics.currentStreak).toBe(1);
      expect(result.current.metrics.longestStreak).toBe(3); // Still 3
    });

    it('should handle streak progression from zero', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // First known
      act(() => {
        result.current.updateMetrics('known', 5.0);
      });

      expect(result.current.metrics.currentStreak).toBe(1);
      expect(result.current.metrics.longestStreak).toBe(1);

      // Break with unknown
      act(() => {
        result.current.updateMetrics('unknown', 5.0);
      });

      expect(result.current.metrics.currentStreak).toBe(0);
      expect(result.current.metrics.longestStreak).toBe(1); // Preserved
    });
  });

  describe('Mastered words tracking', () => {
    it('should count words with stability >= 4 as mastered when marked known', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Below threshold - not mastered
      act(() => {
        result.current.updateMetrics('known', 3.9);
      });
      expect(result.current.metrics.masteredWords).toBe(0);

      // At threshold - mastered
      act(() => {
        result.current.updateMetrics('known', 4.0);
      });
      expect(result.current.metrics.masteredWords).toBe(1);

      // Above threshold - mastered
      act(() => {
        result.current.updateMetrics('known', 6.5);
      });
      expect(result.current.metrics.masteredWords).toBe(2);
    });

    it('should not count mastered words on vague or unknown responses', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Vague with high stability
      act(() => {
        result.current.updateMetrics('vague', 10.0);
      });
      expect(result.current.metrics.masteredWords).toBe(0);

      // Unknown with high stability
      act(() => {
        result.current.updateMetrics('unknown', 10.0);
      });
      expect(result.current.metrics.masteredWords).toBe(0);
    });

    it('should not count mastered words when stability is not provided', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known');
      });

      expect(result.current.metrics.masteredWords).toBe(0);
    });
  });

  describe('Average stability increase calculation', () => {
    it('should calculate cumulative average correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Known: 10 * 0.3 = 3.0
      act(() => {
        result.current.updateMetrics('known', 10);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(3.0, 2);

      // Vague: 5 * 0.1 = 0.5, avg = (3.0 + 0.5) / 2 = 1.75
      act(() => {
        result.current.updateMetrics('vague', 5);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.75, 2);

      // Known: 8 * 0.3 = 2.4, avg = (3.0 + 0.5 + 2.4) / 3 = 1.97
      act(() => {
        result.current.updateMetrics('known', 8);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.97, 2);
    });

    it('should contribute 0 increase for unknown responses', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Known first
      act(() => {
        result.current.updateMetrics('known', 10);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(3.0, 2);

      // Unknown: 10 * 0 = 0, avg = (3.0 + 0) / 2 = 1.5
      act(() => {
        result.current.updateMetrics('unknown', 10);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.5, 2);
    });

    it('should not change average when stability is not provided', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Known with stability
      act(() => {
        result.current.updateMetrics('known', 10);
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(3.0, 2);

      // Known without stability - average unchanged
      act(() => {
        result.current.updateMetrics('known');
      });
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(3.0, 2);
    });
  });

  describe('Multiple consecutive updates', () => {
    it('should handle realistic session simulation', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Sequence: Known, Known, Vague, Unknown, Known, Known, Known
      act(() => {
        result.current.updateMetrics('known', 5.0);
        result.current.updateMetrics('known', 6.0);
        result.current.updateMetrics('vague', 4.0);
        result.current.updateMetrics('unknown', 8.0);
        result.current.updateMetrics('known', 7.0);
        result.current.updateMetrics('known', 5.5);
        result.current.updateMetrics('known', 9.0);
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 7,
        wordsKnown: 5,
        wordsVague: 1,
        wordsUnknown: 1,
        currentStreak: 3, // Last 3 were known
        longestStreak: 3,
        masteredWords: 5, // All known had stability >= 4
      });

      // Verify totals add up
      const { wordsKnown, wordsVague, wordsUnknown, wordsReviewed } = result.current.metrics;
      expect(wordsKnown + wordsVague + wordsUnknown).toBe(wordsReviewed);
    });
  });

  describe('Reset functionality', () => {
    it('should reset all metrics to initial state', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Update metrics
      act(() => {
        result.current.updateMetrics('known', 5.0);
        result.current.updateMetrics('vague', 6.0);
        result.current.updateMetrics('unknown', 7.0);
      });

      expect(result.current.metrics.wordsReviewed).toBe(3);

      // Reset
      act(() => {
        result.current.resetMetrics();
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 0,
        wordsKnown: 0,
        wordsVague: 0,
        wordsUnknown: 0,
        averageStabilityIncrease: 0,
        longestStreak: 0,
        currentStreak: 0,
        masteredWords: 0,
      });
    });

    it('should handle multiple resets', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // First session
      act(() => {
        result.current.updateMetrics('known', 5.0);
        result.current.resetMetrics();
      });
      expect(result.current.metrics.wordsReviewed).toBe(0);

      // Second session
      act(() => {
        result.current.updateMetrics('known', 5.0);
        result.current.updateMetrics('known', 5.0);
        result.current.resetMetrics();
      });
      expect(result.current.metrics.wordsReviewed).toBe(0);
      expect(result.current.metrics.longestStreak).toBe(0);

      // Third session
      act(() => {
        result.current.updateMetrics('known', 5.0);
      });
      expect(result.current.metrics.wordsReviewed).toBe(1);
      expect(result.current.metrics.currentStreak).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero words reviewed correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      expect(result.current.metrics.wordsReviewed).toBe(0);
      expect(result.current.metrics.averageStabilityIncrease).toBe(0); // No division by zero
    });

    it('should handle large stability values', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', 100);
      });

      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(30.0, 2);
      expect(result.current.metrics.masteredWords).toBe(1);
    });

    it('should handle negative stability gracefully', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', -5);
      });

      // Should not crash, stability calculation should handle negative
      expect(result.current.metrics.wordsReviewed).toBe(1);
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(-1.5, 2);
      expect(result.current.metrics.masteredWords).toBe(0); // Negative not >= 4
    });

    it('should handle very long streaks', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateMetrics('known', 5.0);
        }
      });

      expect(result.current.metrics.currentStreak).toBe(100);
      expect(result.current.metrics.longestStreak).toBe(100);
      expect(result.current.metrics.wordsReviewed).toBe(100);
      expect(result.current.metrics.wordsKnown).toBe(100);
    });
  });
});
