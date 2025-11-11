/**
 * List Utils Tests
 *
 * Tests list utility functions for array operations.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { shuffleArray } from '@/utils/list';

describe('list utilities', () => {
  describe('shuffleArray', () => {
    test('should return a new array without modifying the original', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).not.toBe(original);
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });

    test('should return an array with the same elements', () => {
      const original = ['a', 'b', 'c', 'd'];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    test('should handle empty arrays', () => {
      const original: number[] = [];
      const shuffled = shuffleArray(original);

      expect(shuffled).toEqual([]);
      expect(shuffled).not.toBe(original);
    });

    test('should handle single element arrays', () => {
      const original = [42];
      const shuffled = shuffleArray(original);

      expect(shuffled).toEqual([42]);
      expect(shuffled).not.toBe(original);
    });

    test('should produce different orders on multiple calls (statistical test)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = new Set();

      // Run shuffle multiple times and collect results
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffleArray(original);
        results.add(shuffled.join(','));
      }

      // With 10 elements, we should get many different permutations
      // This is a statistical test - it could theoretically fail but is very unlikely
      expect(results.size).toBeGreaterThan(10);
    });
  });
});
