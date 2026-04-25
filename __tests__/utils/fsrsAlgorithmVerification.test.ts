/**
 * FSRS Algorithm Verification Tests
 *
 * CRITICAL: These tests verify that the FSRS (Free Spaced Repetition Scheduler)
 * algorithm is implemented correctly. Any bugs here directly impact user learning.
 *
 * Tests verify:
 * 1. Retrievability via ts-fsrs forgetting_curve: R(t,S) = (1 + FACTOR × t/(9×S))^DECAY
 * 2. Algorithm correctness against known values
 * 3. Mathematical properties and invariants
 * 4. Edge cases and boundary conditions
 *
 * Reference: https://github.com/open-spaced-repetition/ts-fsrs
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { createEmptyCard, Rating, State } from 'ts-fsrs';
import * as fc from 'fast-check';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateRetrievability, calculateRetrievabilityForecast } from '@/utils/fsrsUtils';

describe('FSRS Algorithm Verification', () => {
  describe('Retrievability Formula: FSRS forgetting curve', () => {
    test('calculates retrievability correctly for known values', () => {
      // Test case 1: Stability = 10 days, 1 day elapsed
      const word1 = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const targetDate1 = new Date('2024-01-02T00:00:00Z'); // 1 day later
      const lastReview1 = new Date('2024-01-01T00:00:00Z');

      const result1 = calculateRetrievability(word1, targetDate1, lastReview1);
      expect(result1).toBeCloseTo(0.985682, 3);

      // Test case 2: Stability = 5 days, 2 days elapsed
      const word2 = createTestWord({
        fsrs_stability: 5,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const targetDate2 = new Date('2024-01-03T00:00:00Z'); // 2 days later
      const lastReview2 = new Date('2024-01-01T00:00:00Z');

      const result2 = calculateRetrievability(word2, targetDate2, lastReview2);
      expect(result2).toBeCloseTo(0.950264, 3);

      // Test case 3: Stability = 1 day, 1 day elapsed
      // In FSRS, R = 0.9 when t = S (by design)
      const word3 = createTestWord({
        fsrs_stability: 1,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const targetDate3 = new Date('2024-01-02T00:00:00Z');
      const lastReview3 = new Date('2024-01-01T00:00:00Z');

      const result3 = calculateRetrievability(word3, targetDate3, lastReview3);
      expect(result3).toBeCloseTo(0.9, 3);
    });

    test('returns 1.0 for freshly reviewed words (t = 0)', () => {
      const word = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const sameDate = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, sameDate, sameDate);

      // R = exp(-0/10) = exp(0) = 1.0
      expect(result).toBeCloseTo(1.0, 3);
    });

    test('decreases significantly as time increases far beyond stability', () => {
      const word = createTestWord({
        fsrs_stability: 1,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      // 10 days later with 1 day stability
      const targetDate = new Date('2024-01-11T00:00:00Z');
      const lastReview = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      // FSRS power-law decay is slower than exponential — R ≈ 0.693 at t=10, S=1
      expect(result).toBeLessThan(0.75);
      expect(result).toBeGreaterThan(0);
    });

    test('handles fractional days correctly', () => {
      const word = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      // 12 hours later (0.5 days)
      const targetDate = new Date('2024-01-01T12:00:00Z');
      const lastReview = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      expect(result).toBeCloseTo(0.992648, 3);
    });
  });

  describe('Mathematical Properties (Invariants)', () => {
    test('retrievability is always between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(365), noNaN: true }), // Stability (days)
          fc.integer({ min: 0, max: 365 }), // Days elapsed
          (stability, daysElapsed) => {
            const word = createTestWord({
              fsrs_stability: stability,
              fsrs_last_review: '2024-01-01T00:00:00Z',
            });

            const targetDate = new Date('2024-01-01T00:00:00Z');
            targetDate.setDate(targetDate.getDate() + daysElapsed);
            const lastReview = new Date('2024-01-01T00:00:00Z');

            const result = calculateRetrievability(word, targetDate, lastReview);

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1);

            return true;
          },
        ),
        { numRuns: 500 },
      );
    });

    test('retrievability decreases monotonically over time', () => {
      const word = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });
      const lastReview = new Date('2024-01-01T00:00:00Z');

      let previousRetrievability = 1.0;

      // Test retrievability at increasing time intervals
      for (let days = 0; days <= 30; days++) {
        const targetDate = new Date('2024-01-01T00:00:00Z');
        targetDate.setDate(targetDate.getDate() + days);

        const retrievability = calculateRetrievability(word, targetDate, lastReview);

        // Retrievability should never increase over time
        expect(retrievability).toBeLessThanOrEqual(previousRetrievability);

        previousRetrievability = retrievability;
      }
    });

    test('higher stability results in slower decay', () => {
      const lastReview = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date('2024-01-06T00:00:00Z'); // 5 days later

      const lowStability = createTestWord({
        fsrs_stability: 1,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const highStability = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const lowR = calculateRetrievability(lowStability, targetDate, lastReview);
      const highR = calculateRetrievability(highStability, targetDate, lastReview);

      // Higher stability should have higher retrievability after same time
      expect(highR).toBeGreaterThan(lowR);
    });

    test('retrievability at t = stability is always 0.9 (FSRS design property)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), // Stability
          stability => {
            const word = createTestWord({
              fsrs_stability: stability,
              fsrs_last_review: '2024-01-01T00:00:00Z',
            });

            // Set target date to exactly stability days after last review
            const lastReview = new Date('2024-01-01T00:00:00Z');
            const targetDate = new Date(lastReview.getTime() + stability * 24 * 60 * 60 * 1000);

            const result = calculateRetrievability(word, targetDate, lastReview);

            // In FSRS, stability is defined as the interval where R = 0.9
            expect(result).toBeCloseTo(0.9, 2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('returns 0 for words without review history', () => {
      const word = createTestWord({
        fsrs_last_review: null,
        fsrs_stability: 10,
      });

      const result = calculateRetrievability(word, new Date());
      expect(result).toBe(0);
    });

    test('returns 0 for words with zero stability', () => {
      const word = createTestWord({
        fsrs_stability: 0,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const result = calculateRetrievability(word, new Date('2024-01-02T00:00:00Z'));
      expect(result).toBe(0);
    });

    test('returns 0 for words with negative stability', () => {
      const word = createTestWord({
        fsrs_stability: -5,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const result = calculateRetrievability(word, new Date('2024-01-02T00:00:00Z'));
      expect(result).toBe(0);
    });

    test('handles very small stability values', () => {
      const word = createTestWord({
        fsrs_stability: 0.1,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const targetDate = new Date('2024-01-01T06:00:00Z'); // 6 hours later (0.25 days)
      const lastReview = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      // FSRS power-law: S=0.1, t=0.25 => R ≈ 0.826
      expect(result).toBeCloseTo(0.826, 2);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    test('handles very large stability values', () => {
      const word = createTestWord({
        fsrs_stability: 365,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const targetDate = new Date('2024-01-31T00:00:00Z'); // 30 days later
      const lastReview = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      // FSRS: S=365, t=30 => R ≈ 0.988
      expect(result).toBeCloseTo(0.988, 2);
    });

    test('handles dates in the past (negative time elapsed)', () => {
      const word = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-10T00:00:00Z',
      });

      // Target date is before last review
      const targetDate = new Date('2024-01-05T00:00:00Z');
      const lastReview = new Date('2024-01-10T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      // Negative time should result in R > 1, but we clamp to [0, 1]
      expect(result).toBe(1);
    });
  });

  describe('Retrievability Forecast', () => {
    test('generates correct forecast for multiple words', () => {
      const now = new Date('2024-01-01T00:00:00Z');
      const words = [
        createTestWord({
          fsrs_stability: 10,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 3,
        }),
        createTestWord({
          fsrs_stability: 5,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 2,
        }),
        createTestWord({
          fsrs_stability: 15,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 5,
        }),
      ];

      const forecast = calculateRetrievabilityForecast(words, 3);

      expect(forecast).toHaveLength(3);

      // All words should be included
      expect(forecast[0].wordCount).toBe(3);

      // Average retrievability should decrease over time
      expect(forecast[0].averageRetrievability).toBeGreaterThan(forecast[1].averageRetrievability);
      expect(forecast[1].averageRetrievability).toBeGreaterThan(forecast[2].averageRetrievability);
    });

    test('excludes unreviewed words from forecast', () => {
      const reviewedWord = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: new Date().toISOString(),
        fsrs_reps: 3,
      });

      const unreviewedWord = createTestWord({
        fsrs_last_review: null,
        fsrs_reps: 0,
      });

      const forecast = calculateRetrievabilityForecast([reviewedWord, unreviewedWord], 1);

      // Only reviewed word should be included
      expect(forecast[0].wordCount).toBe(1);
    });

    test('identifies critical words correctly', () => {
      const now = new Date('2024-01-01T00:00:00Z');

      const criticalWord = createTestWord({
        fsrs_stability: 1, // Very low stability
        fsrs_last_review: now.toISOString(),
        fsrs_reps: 1,
      });

      const stableWord = createTestWord({
        fsrs_stability: 100, // High stability
        fsrs_last_review: now.toISOString(),
        fsrs_reps: 10,
      });

      const forecast = calculateRetrievabilityForecast([criticalWord, stableWord], 1);

      // Critical word should have low retrievability after 1 day
      expect(forecast[0].criticalWords).toBeGreaterThan(0);
    });
  });

  describe('FSRS Library Integration', () => {
    test('uses ts-fsrs library correctly for new cards', () => {
      const emptyCard = createEmptyCard(new Date());

      expect(emptyCard.state).toBe(State.New);
      // Note: ts-fsrs v5+ doesn't set stability/difficulty on empty cards
      // They are set after first review
      expect(emptyCard).toBeDefined();
    });

    test('verifies Rating enum values match expected', () => {
      // Ensure Rating values are what we expect
      expect(Rating.Again).toBe(1);
      expect(Rating.Hard).toBe(2);
      expect(Rating.Good).toBe(3);
      expect(Rating.Easy).toBe(4);
    });

    test('verifies State enum values match expected', () => {
      expect(State.New).toBe(0);
      expect(State.Learning).toBe(1);
      expect(State.Review).toBe(2);
      expect(State.Relearning).toBe(3);
    });
  });

  describe('Regression Tests', () => {
    test('should not return NaN for any valid input', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(365), noNaN: true }),
          fc.integer({ min: 0, max: 365 }),
          (stability, daysElapsed) => {
            const word = createTestWord({
              fsrs_stability: stability,
              fsrs_last_review: '2024-01-01T00:00:00Z',
            });

            const targetDate = new Date('2024-01-01T00:00:00Z');
            targetDate.setDate(targetDate.getDate() + daysElapsed);
            const lastReview = new Date('2024-01-01T00:00:00Z');

            const result = calculateRetrievability(word, targetDate, lastReview);

            expect(Number.isNaN(result)).toBeFalsy();

            return true;
          },
        ),
        { numRuns: 500 },
      );
    });

    test('should handle timezone differences correctly', () => {
      const word = createTestWord({
        fsrs_stability: 10,
        fsrs_last_review: '2024-01-01T00:00:00Z', // UTC
      });

      // Same day but different timezone representation
      const targetDate = new Date('2024-01-01T23:59:59Z');
      const lastReview = new Date('2024-01-01T00:00:00Z');

      const result = calculateRetrievability(word, targetDate, lastReview);

      // Should be very close to 1.0 (less than 1 day elapsed)
      expect(result).toBeGreaterThan(0.9);
      expect(result).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Reference Values (Document Expected FSRS Outputs)', () => {
    /**
     * These tests document exact FSRS calculation outputs for reference.
     * They serve as regression tests and documentation of algorithm behavior.
     *
     * IMPORTANT: Values are from ts-fsrs forgetting_curve: R(t,S) = (1 + FACTOR × t/(9×S))^DECAY
     * Only update after verifying the new values are correct.
     */

    test.each([
      {
        scenario: 'new word (just reviewed)',
        stability: 5,
        daysElapsed: 0,
        expectedR: 1.0,
        formula: 'forgetting_curve(0, 5)',
        description: 'Perfect recall immediately after review',
      },
      {
        scenario: 'early review (1 day with S=10)',
        stability: 10,
        daysElapsed: 1,
        expectedR: 0.985682,
        formula: 'forgetting_curve(1, 10)',
        description: 'Minimal forgetting after 1 day',
      },
      {
        scenario: 'medium interval (5 days with S=10)',
        stability: 10,
        daysElapsed: 5,
        expectedR: 0.940344,
        formula: 'forgetting_curve(5, 10)',
        description: 'Good retention at half-stability',
      },
      {
        scenario: 'at stability threshold (t=S)',
        stability: 10,
        daysElapsed: 10,
        expectedR: 0.9,
        formula: 'forgetting_curve(10, 10)',
        description: 'FSRS defines stability as interval where R=0.9',
      },
      {
        scenario: 'overdue review (15 days with S=10)',
        stability: 10,
        daysElapsed: 15,
        expectedR: 0.869825,
        formula: 'forgetting_curve(15, 10)',
        description: 'Gradual forgetting beyond stability',
      },
      {
        scenario: 'very overdue (30 days with S=10)',
        stability: 10,
        daysElapsed: 30,
        expectedR: 0.809388,
        formula: 'forgetting_curve(30, 10)',
        description: 'Power-law decay is slower than exponential',
      },
      {
        scenario: 'low stability word (2 days with S=2)',
        stability: 2,
        daysElapsed: 2,
        expectedR: 0.9,
        formula: 'forgetting_curve(2, 2)',
        description: 'R=0.9 at t=S for any stability',
      },
      {
        scenario: 'high stability word (10 days with S=100)',
        stability: 100,
        daysElapsed: 10,
        expectedR: 0.985682,
        formula: 'forgetting_curve(10, 100)',
        description: 'Excellent retention for well-learned words',
      },
    ])('reference: $scenario', ({ stability, daysElapsed, expectedR, formula, description }) => {
      const word = createTestWord({
        fsrs_stability: stability,
        fsrs_last_review: '2024-01-01T00:00:00Z',
      });

      const lastReview = new Date('2024-01-01T00:00:00Z');
      const targetDate = new Date('2024-01-01T00:00:00Z');
      targetDate.setDate(targetDate.getDate() + daysElapsed);

      const result = calculateRetrievability(word, targetDate, lastReview);

      // Verify against mathematically derived expected value
      expect(result).toBeCloseTo(expectedR, 5); // 5 decimal places precision

      // Document the calculation for reference
      expect({
        description,
        formula,
        inputs: { stability, daysElapsed },
        output: Number(result.toFixed(6)),
        expected: expectedR,
      }).toBeDefined();
    });

    test('reference: retrievability forecast structure and progression', () => {
      const now = new Date('2024-01-01T00:00:00Z');
      const words = [
        createTestWord({
          fsrs_stability: 2,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 1,
        }),
        createTestWord({
          fsrs_stability: 10,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 5,
        }),
        createTestWord({
          fsrs_stability: 50,
          fsrs_last_review: now.toISOString(),
          fsrs_reps: 10,
        }),
      ];

      const forecast = calculateRetrievabilityForecast(words, 7);

      // Verify forecast structure
      expect(forecast).toHaveLength(7);
      expect(forecast[0].wordCount).toBe(3);

      // Verify each forecast day has required fields
      forecast.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('wordCount');
        expect(day).toHaveProperty('averageRetrievability');
        expect(day).toHaveProperty('criticalWords');

        // Retrievability should be valid (0-100 range or 0-1 range depending on implementation)
        expect(day.averageRetrievability).toBeGreaterThanOrEqual(0);
        expect(day.wordCount).toBe(3); // All words should be included each day
      });

      // Document the structure (for reference)
      const firstDay = forecast[0];
      expect({
        structure: {
          hasDate: typeof firstDay.date,
          hasWordCount: typeof firstDay.wordCount,
          hasAvgRetrievability: typeof firstDay.averageRetrievability,
          hasCriticalWords: typeof firstDay.criticalWords,
        },
        example: {
          date: firstDay.date,
          wordCount: firstDay.wordCount,
          // Note: avgRetrievability format depends on implementation (0-1 or 0-100)
        },
      }).toBeDefined();
    });
  });
});
