/**
 * DateTime Utils Tests
 *
 * Tests date/time formatting and parsing utilities.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { formatSecondsToClock, parseSupabaseTimestamp, safePercent } from '@/utils/dateTimeUtils';

describe('dateTimeUtils', () => {
  describe('parseSupabaseTimestamp', () => {
    test('should parse timestamp with space and +00 timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15 12:00:00+00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should parse ISO 8601 timestamp with Z', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00Z');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should parse timestamp without timezone (assume UTC)', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should parse timestamp with space but no timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15 12:00:00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should return null for null input', () => {
      const result = parseSupabaseTimestamp(null);
      expect(result).toBeNull();
    });

    test('should return null for undefined input', () => {
      const result = parseSupabaseTimestamp(undefined);
      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = parseSupabaseTimestamp('');
      expect(result).toBeNull();
    });

    test('should return null for invalid timestamp', () => {
      const result = parseSupabaseTimestamp('invalid-date');
      expect(result).toBeNull();
    });

    test('should handle timestamps with milliseconds', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00.123Z');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.123Z');
    });

    test('should handle timestamps with +HH:MM timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00+05:30');
      expect(result).not.toBeNull();
      // Should be 6:30 UTC (12:00 - 5:30)
      expect(result?.toISOString()).toBe('2024-01-15T06:30:00.000Z');
    });

    test('should handle timestamps with -HH:MM timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00-05:00');
      expect(result).not.toBeNull();
      // Should be 17:00 UTC (12:00 + 5:00)
      expect(result?.toISOString()).toBe('2024-01-15T17:00:00.000Z');
    });

    test('should normalize +00 to Z', () => {
      const withPlus00 = parseSupabaseTimestamp('2024-01-15 12:00:00+00');
      const withZ = parseSupabaseTimestamp('2024-01-15T12:00:00Z');
      expect(withPlus00?.toISOString()).toBe(withZ?.toISOString());
    });
  });

  describe('formatSecondsToClock', () => {
    test('should format seconds to M:SS format', () => {
      expect(formatSecondsToClock(65)).toBe('1:05');
      expect(formatSecondsToClock(125)).toBe('2:05');
      expect(formatSecondsToClock(59)).toBe('0:59');
    });

    test('should handle zero and negative values', () => {
      expect(formatSecondsToClock(0)).toBe('0:00');
      expect(formatSecondsToClock(-5)).toBe('0:00');
    });

    test('should handle large values', () => {
      expect(formatSecondsToClock(3661)).toBe('61:01'); // 1 hour + 1 second
    });

    test('should handle invalid values', () => {
      expect(formatSecondsToClock(NaN)).toBe('0:00');
      expect(formatSecondsToClock(Infinity)).toBe('0:00');
    });
  });

  describe('safePercent', () => {
    test('should calculate percentage correctly', () => {
      expect(safePercent(50, 100)).toBe(50);
      expect(safePercent(25, 200)).toBe(12.5);
      expect(safePercent(0, 100)).toBe(0);
    });

    test('should handle edge cases', () => {
      expect(safePercent(100, 100)).toBe(100);
      expect(safePercent(150, 100)).toBe(100); // Should not exceed 100
      expect(safePercent(-10, 100)).toBe(0); // Negative position
    });

    test('should handle invalid inputs', () => {
      expect(safePercent(50, 0)).toBe(0); // Division by zero
      expect(safePercent(50, -10)).toBe(0); // Negative duration
      expect(safePercent(NaN, 100)).toBe(0); // Invalid position
      expect(safePercent(50, NaN)).toBe(0); // Invalid duration
      expect(safePercent(Infinity, 100)).toBe(0); // Infinite position
      expect(safePercent(50, Infinity)).toBe(0); // Infinite duration
    });

    test('should handle null/undefined values', () => {
      expect(safePercent(null as any, 100)).toBe(0);
      expect(safePercent(50, null as any)).toBe(0);
      expect(safePercent(undefined as any, 100)).toBe(0);
      expect(safePercent(50, undefined as any)).toBe(0);
    });
  });
});
