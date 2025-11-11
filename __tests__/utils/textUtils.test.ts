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

import { calculateReadingTime } from '@/utils/textUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    test('should return "1m" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1m');
    });

    test('should return "1m" for 1-4 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1m');
      expect(calculateReadingTime(3)).toBe('1m');
      expect(calculateReadingTime(4)).toBe('1m');
    });

    test('should return "2m" for 5-8 sentences', () => {
      expect(calculateReadingTime(5)).toBe('2m');
      expect(calculateReadingTime(7)).toBe('2m');
      expect(calculateReadingTime(8)).toBe('2m');
    });

    test('should return "3m" for 9-12 sentences', () => {
      expect(calculateReadingTime(9)).toBe('3m');
      expect(calculateReadingTime(10)).toBe('3m');
      expect(calculateReadingTime(12)).toBe('3m');
    });

    test('should return "30m" for 120 sentences', () => {
      expect(calculateReadingTime(120)).toBe('30m');
    });

    test('should return "49m" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('49m');
    });

    test('should handle very large sentence counts', () => {
      expect(calculateReadingTime(270)).toBe('68m');
      expect(calculateReadingTime(540)).toBe('135m');
    });

    test('should round up to nearest minute', () => {
      // 7 sentences = 1.75 minutes, should round to 2m
      expect(calculateReadingTime(7)).toBe('2m');

      // 25 sentences = 6.25 minutes, should round to 7m
      expect(calculateReadingTime(25)).toBe('7m');
    });

    test('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1m');
    });
  });
});
