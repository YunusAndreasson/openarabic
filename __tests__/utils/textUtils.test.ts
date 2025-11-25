/**
 * Text Utils Tests
 *
 * Tests text utility functions for reading time calculation.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { calculateReadingTime } from '@/utils/stringUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    test('should return "1 min" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1 min');
    });

    test('should return "1 min" for 1-4 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1 min');
      expect(calculateReadingTime(3)).toBe('1 min');
      expect(calculateReadingTime(4)).toBe('1 min');
    });

    test('should return "2 min" for 5-8 sentences', () => {
      expect(calculateReadingTime(5)).toBe('2 min');
      expect(calculateReadingTime(7)).toBe('2 min');
      expect(calculateReadingTime(8)).toBe('2 min');
    });

    test('should return "3 min" for 9-12 sentences', () => {
      expect(calculateReadingTime(9)).toBe('3 min');
      expect(calculateReadingTime(10)).toBe('3 min');
      expect(calculateReadingTime(12)).toBe('3 min');
    });

    test('should return "30 min" for 120 sentences', () => {
      expect(calculateReadingTime(120)).toBe('30 min');
    });

    test('should return "49 min" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('49 min');
    });

    test('should handle very large sentence counts', () => {
      expect(calculateReadingTime(270)).toBe('68 min');
      expect(calculateReadingTime(540)).toBe('135 min');
    });

    test('should round up to nearest minute', () => {
      // 7 sentences = 1.75 minutes, should round to 2 min
      expect(calculateReadingTime(7)).toBe('2 min');

      // 25 sentences = 6.25 minutes, should round to 7 min
      expect(calculateReadingTime(25)).toBe('7 min');
    });

    test('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1 min');
    });
  });
});
