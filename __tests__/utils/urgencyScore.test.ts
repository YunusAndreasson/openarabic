/**
 * Urgency Score Tests
 *
 * Tests stability progress and color utilities for vocabulary memory strength.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { getStabilityProgressColor } from '@/utils/urgencyScore';

describe('urgencyScore', () => {
  describe('getStabilityProgressColor', () => {
    test('should return error for null stability', () => {
      expect(getStabilityProgressColor(null)).toBe('error');
    });

    test('should return error for undefined stability', () => {
      expect(getStabilityProgressColor(undefined)).toBe('error');
    });

    test('should return error for stability 0-2.99 (red zone)', () => {
      expect(getStabilityProgressColor(0)).toBe('error');
      expect(getStabilityProgressColor(1)).toBe('error');
      expect(getStabilityProgressColor(2)).toBe('error');
      expect(getStabilityProgressColor(2.99)).toBe('error');
    });

    test('should return warning for stability 3-6.99 (yellow zone)', () => {
      expect(getStabilityProgressColor(3)).toBe('warning');
      expect(getStabilityProgressColor(4)).toBe('warning');
      expect(getStabilityProgressColor(5)).toBe('warning');
      expect(getStabilityProgressColor(6)).toBe('warning');
      expect(getStabilityProgressColor(6.99)).toBe('warning');
    });

    test('should return success for stability 7+ (green zone)', () => {
      expect(getStabilityProgressColor(7)).toBe('success');
      expect(getStabilityProgressColor(8)).toBe('success');
      expect(getStabilityProgressColor(9)).toBe('success');
      expect(getStabilityProgressColor(10)).toBe('success');
    });

    test('should return success for stability above 10', () => {
      expect(getStabilityProgressColor(15)).toBe('success');
      expect(getStabilityProgressColor(100)).toBe('success');
    });

    test('should return error for negative stability', () => {
      expect(getStabilityProgressColor(-1)).toBe('error');
      expect(getStabilityProgressColor(-10)).toBe('error');
    });

    test('should handle boundary values correctly', () => {
      // Just below threshold
      expect(getStabilityProgressColor(2.999)).toBe('error');
      expect(getStabilityProgressColor(6.999)).toBe('warning');

      // At threshold
      expect(getStabilityProgressColor(3)).toBe('warning');
      expect(getStabilityProgressColor(7)).toBe('success');
    });
  });
});
