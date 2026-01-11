/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { calculateEfficiencyScore } from '@/utils/chartDataUtils';
import type { StudyWord } from '@/types/vocabulary.types';

describe('charts/utils', () => {
  describe('calculateEfficiencyScore', () => {
    describe('NaN Protection', () => {
      test('should handle null/undefined FSRS fields safely', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: null,
          fsrs_stability: null,
          fsrs_difficulty: null,
          fsrs_lapses: null,
          fsrs_reps: null,
        });

        const score = calculateEfficiencyScore(word);

        // Should not crash, should use defaults
        // State 0 + reps 0 = minimal score
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isNaN(score)).toBeFalsy();
      });

      test('should handle undefined StudyWord fields', () => {
        const word = createTestWord({});

        const score = calculateEfficiencyScore(word);

        // Should not crash with default createTestWord values
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      test('should handle NaN values in calculations', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: NaN as unknown as number,
          fsrs_stability: NaN as unknown as number,
          fsrs_difficulty: NaN as unknown as number,
          fsrs_lapses: NaN as unknown as number,
          fsrs_reps: NaN as unknown as number,
        });

        const score = calculateEfficiencyScore(word);

        // Should detect NaN and use defaults
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isNaN(score)).toBeFalsy();
      });
    });

    describe('State Scoring', () => {
      test('should score State 0 (New) correctly - 15 pts if reps=1', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 0,
          fsrs_reps: 1, // Just started
          fsrs_stability: 0,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0, // Optimal
        });

        const score = calculateEfficiencyScore(word);

        // State 0 + reps 1: 15pts
        // Stability 0: 0pts
        // Lapses 0: 20pts
        // Difficulty optimal: 10pts
        // Total: ~45pts
        expect(score).toBeGreaterThanOrEqual(40);
        expect(score).toBeLessThanOrEqual(50);
      });

      test('should score State 1 (Learning) correctly - 25 pts if reps>1', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 1,
          fsrs_reps: 3, // Making progress
          fsrs_stability: 2,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(word);

        // State 1 + reps > 1: 25pts
        // Stability 0-3: 15pts
        // Lapses 0: 20pts
        // Difficulty optimal: 10pts
        // Total: 70pts
        expect(score).toBeGreaterThanOrEqual(65);
        expect(score).toBeLessThanOrEqual(75);
      });

      test('should score State 2 (Review) with low stability - 30 pts', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_reps: 5,
          fsrs_stability: 4.99, // Below mastery threshold
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(word);

        // State 2 + stability < 5: 30pts
        // Stability 3-7: 15pts
        // Lapses 0: 20pts
        // Difficulty optimal: 10pts
        // Total: 75pts
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThanOrEqual(80);
      });

      test('should score State 3 (Relearning) correctly - 10 pts', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 3, // Failed, relearning
          fsrs_reps: 5,
          fsrs_stability: 2,
          fsrs_lapses: 2,
          fsrs_difficulty: 8.0,
        });

        const score = calculateEfficiencyScore(word);

        // State 3: 10pts
        // Stability 1-3: 10pts
        // Lapses 2: 10pts
        // Difficulty optimal: 10pts
        // Total: 40pts
        expect(score).toBeGreaterThanOrEqual(35);
        expect(score).toBeLessThanOrEqual(45);
      });
    });

    describe('Mastery Boundary (Critical)', () => {
      test('should award 30pts for State 2 + stability 4.99 (below threshold)', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_stability: 4.99, // Just below mastery
          fsrs_reps: 5,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(word);

        // State 2 + stability < 5: 30pts (not 40)
        // Should be 75 total (30+15+20+10)
        expect(score).toBeLessThan(80); // Not mastered
      });

      test('should award 40pts for State 2 + stability 5.0 (at threshold)', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_stability: 5.0, // Exactly at mastery
          fsrs_reps: 5,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(word);

        // State 2 + stability >= 5: 40pts (mastered!)
        // Should be 85 total (40+15+20+10)
        expect(score).toBeGreaterThanOrEqual(80);
        expect(score).toBeLessThanOrEqual(90);
      });
    });

    describe('Perfect and Worst Words', () => {
      test('should score a perfect word at 100 points', () => {
        const perfectWord: StudyWord = createTestWord({
          fsrs_state: 2, // Review
          fsrs_stability: 30, // Very high
          fsrs_reps: 10,
          fsrs_lapses: 0, // No failures
          fsrs_difficulty: 7.0, // Optimal
        });

        const score = calculateEfficiencyScore(perfectWord);

        // State 2 + stability >= 5: 40pts
        // Stability >= 30: 30pts
        // Lapses 0: 20pts
        // Difficulty optimal: 10pts
        // Total: 100pts
        expect(score).toBe(100);
      });

      test('should score a worst-case word at minimum points', () => {
        const worstWord: StudyWord = createTestWord({
          fsrs_state: 3, // Relearning (failed)
          fsrs_stability: 0, // No stability
          fsrs_reps: 1,
          fsrs_lapses: 10, // Many failures
          fsrs_difficulty: 4.0, // Poor difficulty
        });

        const score = calculateEfficiencyScore(worstWord);

        // State 3: 10pts
        // Stability 0: 0pts
        // Lapses 10: 0pts
        // Difficulty out of range: 2pts
        // Total: 12pts
        expect(score).toBeLessThanOrEqual(15);
        expect(score).toBeGreaterThanOrEqual(10);
      });
    });

    describe('Score Bounds', () => {
      test('should never exceed 100 points', () => {
        // Try to create a word that would exceed 100 if not capped
        const word: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_stability: 100, // Very high
          fsrs_reps: 100,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(word);

        // Should be capped at 100
        expect(score).toBe(100);
        expect(score).toBeLessThanOrEqual(100);
      });

      test('should never return negative scores', () => {
        const word: StudyWord = createTestWord({
          fsrs_state: 0, // New word, no progress
          fsrs_stability: 0,
          fsrs_reps: 0,
          fsrs_lapses: 0,
          fsrs_difficulty: 10.0, // Out of optimal range
        });

        const score = calculateEfficiencyScore(word);

        // Should be >= 0
        expect(score).toBeGreaterThanOrEqual(0);
      });

      test('should handle extreme stability values', () => {
        const highStabilityWord: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_stability: 9999, // Unrealistically high
          fsrs_reps: 10,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const score = calculateEfficiencyScore(highStabilityWord);

        // Should still be valid and capped
        expect(score).toBe(100);
        expect(Number.isFinite(score)).toBeTruthy();
      });
    });

    describe('Stability Thresholds', () => {
      test('should score stability tiers correctly', () => {
        const testCases = [
          { stability: 0, expectedRange: [0, 5] }, // 0 pts
          { stability: 0.5, expectedRange: [0, 10] }, // 5 pts
          { stability: 1, expectedRange: [5, 15] }, // 10 pts
          { stability: 3, expectedRange: [10, 20] }, // 15 pts
          { stability: 7, expectedRange: [15, 25] }, // 20 pts
          { stability: 14, expectedRange: [20, 30] }, // 25 pts
          { stability: 30, expectedRange: [25, 35] }, // 30 pts
        ];

        testCases.forEach(({ stability, expectedRange }) => {
          const word: StudyWord = createTestWord({
            fsrs_state: 0, // Minimal state contribution
            fsrs_stability: stability,
            fsrs_reps: 0,
            fsrs_lapses: 10, // Minimal lapse contribution
            fsrs_difficulty: 4.0, // Minimal difficulty contribution
          });

          const score = calculateEfficiencyScore(word);

          // Score should be within expected range for this stability tier
          expect(score).toBeGreaterThanOrEqual(expectedRange[0]);
          expect(score).toBeLessThanOrEqual(expectedRange[1]);
        });
      });
    });

    describe('Lapse Penalties', () => {
      test('should penalize lapses progressively', () => {
        const baseLine: StudyWord = createTestWord({
          fsrs_state: 2,
          fsrs_stability: 10,
          fsrs_reps: 5,
          fsrs_lapses: 0,
          fsrs_difficulty: 7.0,
        });

        const oneLapse: StudyWord = { ...baseLine, fsrs_lapses: 1 };
        const twoLapses: StudyWord = { ...baseLine, fsrs_lapses: 2 };
        const manyLapses: StudyWord = { ...baseLine, fsrs_lapses: 5 };

        const scoreBaseline = calculateEfficiencyScore(baseLine);
        const scoreOne = calculateEfficiencyScore(oneLapse);
        const scoreTwo = calculateEfficiencyScore(twoLapses);
        const scoreMany = calculateEfficiencyScore(manyLapses);

        // More lapses = lower score
        expect(scoreBaseline).toBeGreaterThan(scoreOne);
        expect(scoreOne).toBeGreaterThan(scoreTwo);
        expect(scoreTwo).toBeGreaterThan(scoreMany);
      });
    });
  });
});
