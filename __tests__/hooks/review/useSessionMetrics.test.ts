/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useSessionMetrics } from '@/hooks/review/useSessionMetrics';

describe('useSessionMetrics', () => {
  describe('Unique word counting (CRITICAL)', () => {
    test('should count 2 unique words when reviewing 2 different words', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Review word 1 (rootId: 100)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });

        // Review word 2 (rootId: 200)
        result.current.updateMetrics('known', {
          rootId: 200,
          oldStability: 1.5,
          newStability: 2.8,
        });
      });

      // CRITICAL: Should show 2 unique words, not 2 total reviews
      expect(result.current.metrics.wordsReviewed).toBe(2);
      expect(result.current.metrics.wordsKnown).toBe(2);
    });

    test('should count 2 unique words when reviewing same word twice', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Review word 1 first time
        result.current.updateMetrics('unknown', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 1.8,
        });

        // Review different word
        result.current.updateMetrics('known', {
          rootId: 200,
          oldStability: 1.5,
          newStability: 2.8,
        });

        // Review word 1 AGAIN (same rootId)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 1.8,
          newStability: 3.2,
        });
      });

      // Should still count as 2 unique words (100 and 200)
      expect(result.current.metrics.wordsReviewed).toBe(2);
      expect(result.current.metrics.wordsKnown).toBe(2); // 2 known responses
      expect(result.current.metrics.wordsUnknown).toBe(1); // 1 unknown response
    });

    test('should count 3 unique words when reviewing 3 different words', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });
        result.current.updateMetrics('unknown', {
          rootId: 200,
          oldStability: 1.5,
          newStability: 2.0,
        });
        result.current.updateMetrics('unknown', {
          rootId: 300,
          oldStability: 3.0,
          newStability: 2.5,
        });
      });

      expect(result.current.metrics.wordsReviewed).toBe(3);
    });

    test('should handle missing rootId with backwards compatibility', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Call without wordData (backwards compatibility)
        result.current.updateMetrics('known');
        result.current.updateMetrics('known');
      });

      // Without rootId, falls back to incrementing each call
      expect(result.current.metrics.wordsReviewed).toBe(2);
    });
  });

  describe('NEW mastered words (not total) - CRITICAL', () => {
    test('should count word that crosses 5.0 threshold during session', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word goes from 4.5 -> 5.5 (crosses threshold)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 4.5,
          newStability: 5.5,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(1);
    });

    test('should NOT count word that was already mastered', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word goes from 6.0 -> 7.0 (already above threshold)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 6.0,
          newStability: 7.0,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(0);
    });

    test('should NOT count word that stays below threshold', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word goes from 2.0 -> 4.8 (still below 5.0)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 4.8,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(0);
    });

    test('should count exactly at 5.0 threshold', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word goes from 4.8 -> 5.0 (exactly at threshold)
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 4.8,
          newStability: 5.0,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(1);
    });

    test('should count multiple words crossing threshold', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word 1: crosses threshold
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 4.2,
          newStability: 5.3,
        });

        // Word 2: already mastered (doesn't count)
        result.current.updateMetrics('known', {
          rootId: 200,
          oldStability: 6.0,
          newStability: 7.0,
        });

        // Word 3: crosses threshold
        result.current.updateMetrics('known', {
          rootId: 300,
          oldStability: 4.9,
          newStability: 5.1,
        });

        // Word 4: stays below threshold (doesn't count)
        result.current.updateMetrics('known', {
          rootId: 400,
          oldStability: 3.0,
          newStability: 4.5,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(2); // Only words 100 and 300
    });

    test('should not count mastered on unknown responses', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Unknown - crosses threshold but not "known"
        result.current.updateMetrics('unknown', {
          rootId: 100,
          oldStability: 4.5,
          newStability: 5.5,
        });

        // Another unknown - crosses threshold but not "known"
        result.current.updateMetrics('unknown', {
          rootId: 200,
          oldStability: 4.5,
          newStability: 5.5,
        });
      });

      expect(result.current.metrics.masteredWords).toBe(0);
    });
  });

  describe('Actual stability increase calculation', () => {
    test('should calculate actual stability increase (not estimated)', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word 1: +1.5 increase
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });
      });

      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.5, 2);
    });

    test('should calculate average of multiple increases', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word 1: +1.5 increase
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });

        // Word 2: +0.5 increase
        result.current.updateMetrics('unknown', {
          rootId: 200,
          oldStability: 1.5,
          newStability: 2.0,
        });

        // Average: (1.5 + 0.5) / 2 = 1.0
      });

      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.0, 2);
    });

    test('should handle negative stability changes', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word goes down in stability (unknown response)
        result.current.updateMetrics('unknown', {
          rootId: 100,
          oldStability: 3.0,
          newStability: 2.5,
        });
      });

      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(-0.5, 2);
    });

    test('should not change average when stability data missing', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // First word with stability data
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });

        // Second word without stability data
        result.current.updateMetrics('known', { rootId: 200 });
      });

      // Average should still be 1.5 from first word only
      expect(result.current.metrics.averageStabilityIncrease).toBeCloseTo(1.5, 2);
    });
  });

  describe('Streak logic', () => {
    test('should track current streak correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', { rootId: 100 });
        result.current.updateMetrics('known', { rootId: 200 });
        result.current.updateMetrics('known', { rootId: 300 });
      });

      expect(result.current.metrics.currentStreak).toBe(3);
      expect(result.current.metrics.longestStreak).toBe(3);
    });

    test('should reset streak on unknown', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', { rootId: 100 });
        result.current.updateMetrics('unknown', { rootId: 200 });
      });

      expect(result.current.metrics.currentStreak).toBe(0);
      expect(result.current.metrics.longestStreak).toBe(1);
    });
  });

  describe('Response type tracking', () => {
    test('should track all response types correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        result.current.updateMetrics('known', { rootId: 100 });
        result.current.updateMetrics('known', { rootId: 200 });
        result.current.updateMetrics('unknown', { rootId: 300 });
        result.current.updateMetrics('unknown', { rootId: 400 });
        result.current.updateMetrics('known', { rootId: 500 });
      });

      expect(result.current.metrics).toMatchObject({
        wordsKnown: 3,
        wordsUnknown: 2,
      });

      // Totals should add up
      const { wordsKnown, wordsUnknown } = result.current.metrics;
      expect(wordsKnown + wordsUnknown).toBe(5);
    });
  });

  describe('Reset functionality', () => {
    test('should reset all metrics including unique words set', () => {
      const { result } = renderHook(() => useSessionMetrics());

      // Build up metrics
      act(() => {
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 2.0,
          newStability: 3.5,
        });
        result.current.updateMetrics('known', {
          rootId: 200,
          oldStability: 4.5,
          newStability: 5.5,
        });
      });

      expect(result.current.metrics.wordsReviewed).toBe(2);
      expect(result.current.metrics.masteredWords).toBe(1);

      // Reset
      act(() => {
        result.current.resetMetrics();
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 0,
        wordsKnown: 0,
        wordsUnknown: 0,
        averageStabilityIncrease: 0,
        longestStreak: 0,
        currentStreak: 0,
        masteredWords: 0,
      });

      // After reset, same words should be counted again
      act(() => {
        result.current.updateMetrics('known', { rootId: 100 });
      });

      expect(result.current.metrics.wordsReviewed).toBe(1);
    });
  });

  describe('Real session simulation', () => {
    test('should handle realistic practice session correctly', () => {
      const { result } = renderHook(() => useSessionMetrics());

      act(() => {
        // Word 1: Unknown -> reviewed again later
        result.current.updateMetrics('unknown', {
          rootId: 100,
          oldStability: 4.2,
          newStability: 3.8,
        });

        // Word 2: Known -> crosses threshold
        result.current.updateMetrics('known', {
          rootId: 200,
          oldStability: 4.6,
          newStability: 5.2,
        });

        // Word 1 again: Known -> crosses threshold this time
        result.current.updateMetrics('known', {
          rootId: 100,
          oldStability: 3.8,
          newStability: 5.1,
        });

        // Word 3: Unknown -> doesn't cross threshold
        result.current.updateMetrics('unknown', {
          rootId: 300,
          oldStability: 3.0,
          newStability: 3.5,
        });
      });

      expect(result.current.metrics).toMatchObject({
        wordsReviewed: 3, // 3 unique words (100, 200, 300)
        wordsKnown: 2, // 2 known responses
        wordsUnknown: 2, // 2 unknown responses
        masteredWords: 2, // Words 100 and 200 crossed threshold
        currentStreak: 0, // Reset by unknown at end
        longestStreak: 2, // Word 200 (known) + Word 100 (known) = 2 consecutive known
      });
    });
  });
});
