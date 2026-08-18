/**
 * useMemoryInsights Hook Tests
 *
 * Tests the forgetting-curve numbers behind the practice hero and the
 * due-words sheet.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

import { renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useMemoryInsights } from '@/hooks/vocabulary/useMemoryInsights';
import type { StudyWord } from '@/types/vocabulary.types';
import { rootId } from '@/__tests__/helpers/ids';

jest.mock('@/constants/chartConstants', () => ({
  DAYS_7: 7,
}));

jest.mock('@/utils/fsrsUtils', () => ({
  calculateRetrievabilityForecast: (words: StudyWord[], days: number) => {
    if (words.length === 0) return [];
    // `wordCount` is part of RetrievabilityForecast and the hook reads it as
    // the population the score speaks for — omitting it made every mocked
    // forecast look like it had measured nothing.
    const measured = words.filter(w => (w.fsrs_reps ?? 0) > 0).length;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      averageRetrievability: 80 - i * 5, // Declining
      criticalWords: i,
      wordCount: measured,
    }));
  },
}));

describe('useMemoryInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    test('returns default insights for empty word list', () => {
      const { result } = renderHook(() => useMemoryInsights([]));

      expect(result.current).toEqual({
        currentRetrievability: 0,
        weekRetrievability: 0,
        criticalWords: 0,
        criticalWordsInWeek: 0,
        recallableWords: 0,
        measuredWords: 0,
      });
    });
  });

  describe('With Study Words', () => {
    test('counts only reviewed words as measured', () => {
      // fsrs_reps > 0 is what makes these reviewed words rather than saved
      // ones: a State 2 card has necessarily been through a review, and only
      // reviewed words carry the memory state the forgetting curve reads.
      const words = [
        createTestWord({ fsrs_state: 2, fsrs_stability: 5, fsrs_reps: 3 }),
        createTestWord({ fsrs_state: 2, fsrs_stability: 3, fsrs_reps: 2 }),
      ];

      const { result } = renderHook(() => useMemoryInsights(words));

      expect(result.current.measuredWords).toBe(2);
    });

    test('words saved but never reviewed measure nothing', () => {
      const words = [createTestWord({ fsrs_state: 0, fsrs_reps: 0 })];

      const { result } = renderHook(() => useMemoryInsights(words));

      expect(result.current.measuredWords).toBe(0);
      expect(result.current.recallableWords).toBe(0);
    });
  });

  describe('Insights Calculation', () => {
    test('provides current retrievability as a percentage', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useMemoryInsights(words));

      expect(typeof result.current.currentRetrievability).toBe('number');
      expect(result.current.currentRetrievability).toBeGreaterThanOrEqual(0);
      expect(result.current.currentRetrievability).toBeLessThanOrEqual(100);
    });

    test('recallableWords is the percentage un-averaged, never more than the population', () => {
      const words = [
        createTestWord({ root_id: rootId(1), fsrs_state: 2, fsrs_stability: 5, fsrs_reps: 3 }),
        createTestWord({ root_id: rootId(2), fsrs_state: 2, fsrs_stability: 40, fsrs_reps: 4 }),
      ];

      const { result } = renderHook(() => useMemoryInsights(words));
      const { recallableWords, currentRetrievability, measuredWords } = result.current;

      expect(recallableWords).toBeLessThanOrEqual(measuredWords);
      expect(recallableWords).toBe(
        Math.min(measuredWords, Math.round((currentRetrievability / 100) * measuredWords)),
      );
    });

    test('provides critical words count', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useMemoryInsights(words));

      expect(typeof result.current.criticalWords).toBe('number');
      expect(result.current.criticalWords).toBeGreaterThanOrEqual(0);
    });

    test('criticalWordsInWeek is never negative', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5, fsrs_reps: 3 })];

      const { result } = renderHook(() => useMemoryInsights(words));

      expect(result.current.criticalWordsInWeek).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memoization', () => {
    test('returns consistent data for same input', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result, rerender } = renderHook(() => useMemoryInsights(words));

      const firstData = result.current;

      rerender(undefined);

      // Same input, same object identity — nothing downstream re-renders.
      expect(result.current).toBe(firstData);
    });
  });
});
