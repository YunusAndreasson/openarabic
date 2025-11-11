/**
 * FSRS Utils Tests
 *
 * Tests FSRS (Free Spaced Repetition Scheduler) utility functions.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateRetrievability,
  calculateRetrievabilityForecast,
  calculateRetrievabilityTrend,
} from '@/utils/fsrsUtils';

// Helper to create study words for this test
const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord(overrides);

describe('fsrsUtils', () => {
  describe('calculateRetrievability', () => {
    test('should calculate retrievability correctly', () => {
      const word = createStudyWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const targetDate = new Date('2024-01-02T00:00:00Z'); // 1 day later
      const lastReviewDate = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReviewDate);

      // R = exp(-1/10) ≈ 0.905
      expect(result).toBeCloseTo(0.905, 3);
    });

    test('should return 0 for words without review history', () => {
      const word = createStudyWord({
        fsrs_last_review: null,
        fsrs_stability: 10,
      });
      const targetDate = new Date();

      const result = calculateRetrievability(word, targetDate);
      expect(result).toBe(0);
    });

    test('should return 0 for words with zero stability', () => {
      const word = createStudyWord({
        fsrs_stability: 0,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const targetDate = new Date('2024-01-02T00:00:00Z');

      const result = calculateRetrievability(word, targetDate);
      expect(result).toBe(0);
    });
  });

  describe('calculateRetrievabilityForecast', () => {
    test('should calculate forecast for reviewed words', () => {
      const now = new Date().toISOString();
      const words = [
        createStudyWord({
          fsrs_stability: 10,
          fsrs_last_review: now,
          fsrs_reps: 3,
        }),
        createStudyWord({
          fsrs_stability: 5,
          fsrs_last_review: now,
          fsrs_reps: 2,
        }),
      ];

      const result = calculateRetrievabilityForecast(words, 3);

      expect(result).toHaveLength(3);
      expect(result[0].wordCount).toBe(2);
      expect(result[0].averageRetrievability).toBeGreaterThan(0);
    });

    test('should filter out unreviewed words', () => {
      const words = [
        createStudyWord({
          fsrs_last_review: null,
          fsrs_reps: 0,
        }),
        createStudyWord({
          fsrs_last_review: new Date().toISOString(),
          fsrs_reps: 3,
        }),
      ];

      const result = calculateRetrievabilityForecast(words, 1);

      expect(result[0].wordCount).toBe(1);
    });
  });

  describe('calculateRetrievabilityForecast - critical words tracking', () => {
    test('should track critical words in forecast data', () => {
      const reviewDate = '2024-01-01T00:00:00Z';
      const words = [
        createStudyWord({
          fsrs_stability: 1, // Very low stability = critical
          fsrs_last_review: reviewDate,
          fsrs_reps: 3,
        }),
        createStudyWord({
          fsrs_stability: 10, // High stability = not critical
          fsrs_last_review: reviewDate,
          fsrs_reps: 3,
        }),
      ];

      const result = calculateRetrievabilityForecast(words, 1);
      // The forecast should include criticalWords count
      // Word with stability 1 will have low retrievability (< 0.7 threshold)
      expect(result[0].criticalWords).toBeGreaterThan(0);
      expect(result[0].wordCount).toBe(2);
    });
  });

  describe('calculateRetrievabilityTrend', () => {
    test('should return stable for insufficient data', () => {
      const data = [
        {
          date: new Date(),
          averageRetrievability: 80,
          wordCount: 1,
          criticalWords: 0,
          urgentWords: 0,
        },
      ];

      const result = calculateRetrievabilityTrend(data);
      expect(result).toBe('stable');
    });

    test('should calculate trend correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const data = [
        { date: today, averageRetrievability: 80, wordCount: 1, criticalWords: 0, urgentWords: 0 },
        {
          date: tomorrow,
          averageRetrievability: 70,
          wordCount: 1,
          criticalWords: 0,
          urgentWords: 0,
        },
      ];

      const result = calculateRetrievabilityTrend(data);
      expect(result).toBe('declining');
    });
  });
});
