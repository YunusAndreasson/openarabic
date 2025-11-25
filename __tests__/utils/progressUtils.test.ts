/**
 * Progress Utils Tests
 *
 * Tests progress calculation utilities for reading articles.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { calculateProgressPercentage } from '@/utils/progressUtils';

describe('progressUtils', () => {
  describe('calculateProgressPercentage', () => {
    test('should return 0 for no progress (lastSentenceRead = -1)', () => {
      expect(calculateProgressPercentage(-1, 100)).toBe(0);
      expect(calculateProgressPercentage(-1, 10)).toBe(0);
      expect(calculateProgressPercentage(-1, 1)).toBe(0);
    });

    test('should return 0 for empty article (totalSentences = 0)', () => {
      expect(calculateProgressPercentage(0, 0)).toBe(0);
      expect(calculateProgressPercentage(-1, 0)).toBe(0);
      expect(calculateProgressPercentage(5, 0)).toBe(0);
    });

    test('should calculate correct percentage for first sentence read', () => {
      // Index 0 means 1 sentence read out of 10 = 10%
      expect(calculateProgressPercentage(0, 10)).toBe(10);
      // Index 0 means 1 sentence read out of 100 = 1%
      expect(calculateProgressPercentage(0, 100)).toBe(1);
    });

    test('should return 100 for last sentence read', () => {
      // Index 99 means all 100 sentences read
      expect(calculateProgressPercentage(99, 100)).toBe(100);
      // Index 9 means all 10 sentences read
      expect(calculateProgressPercentage(9, 10)).toBe(100);
      // Index 0 means 1 sentence read out of 1
      expect(calculateProgressPercentage(0, 1)).toBe(100);
    });

    test('should calculate correct percentage for middle progress', () => {
      // Index 49 means 50 sentences read out of 100 = 50%
      expect(calculateProgressPercentage(49, 100)).toBe(50);
      // Index 4 means 5 sentences read out of 10 = 50%
      expect(calculateProgressPercentage(4, 10)).toBe(50);
      // Index 24 means 25 sentences read out of 100 = 25%
      expect(calculateProgressPercentage(24, 100)).toBe(25);
    });

    test('should round percentages correctly', () => {
      // Index 0 means 1 sentence read out of 3 = 33.33... → 33%
      expect(calculateProgressPercentage(0, 3)).toBe(33);
      // Index 1 means 2 sentences read out of 3 = 66.66... → 67%
      expect(calculateProgressPercentage(1, 3)).toBe(67);
    });

    test('should handle negative index less than -1 as no progress', () => {
      expect(calculateProgressPercentage(-5, 100)).toBe(0);
      expect(calculateProgressPercentage(-100, 100)).toBe(0);
    });
  });
});
