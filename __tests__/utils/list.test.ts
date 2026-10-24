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

import { isOneOf, seededRandom, shuffleArray, tallyBands } from '@/utils/list';

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

    test('is reproducible under an injected random source', () => {
      // Pinned against the three hand-written Fisher-Yates loops this replaced
      // (the explore rails' seeded one among them): same sequence, same order.
      const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      expect(shuffleArray(items, seededRandom(42))).toEqual([0, 7, 3, 5, 2, 1, 8, 9, 4, 6]);
      expect(shuffleArray(items, seededRandom(7)).slice(0, 3)).toEqual([6, 5, 8]);
    });

    test('swaps undefined members like any other', () => {
      const random = () => 0; // always swap with index 0
      expect(shuffleArray([undefined, 1, 2], random)).toEqual([1, 2, undefined]);
    });
  });

  describe('seededRandom', () => {
    test('yields the same sequence for the same seed', () => {
      const a = seededRandom(1);
      const b = seededRandom(1);
      const first = [a(), a(), a()];
      expect([b(), b(), b()]).toEqual(first);
      expect(first[0]).toBeCloseTo(0.6270739405881613, 15);
      first.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      });
    });
  });

  describe('isOneOf', () => {
    const SCOPES = ['all', 'due'] as const;

    test('is true only for members', () => {
      expect(isOneOf(SCOPES, 'due')).toBe(true);
      expect(isOneOf(SCOPES, 'Due')).toBe(false);
      expect(isOneOf(SCOPES, '')).toBe(false);
    });
  });

  describe('tallyBands', () => {
    const KEYS = ['low', 'high'] as const;
    const LABELS = { low: 'Low', high: 'High' };
    const bandOf = (n: number) => (n < 0 ? null : n < 10 ? 'low' : 'high');

    test('counts every band in key order, zeros included, and skips the unbanded', () => {
      expect(tallyBands([12, 3, -1, 5], KEYS, LABELS, bandOf)).toEqual([
        { key: 'low', label: 'Low', count: 2 },
        { key: 'high', label: 'High', count: 1 },
      ]);
      expect(tallyBands([], KEYS, LABELS, bandOf)).toEqual([
        { key: 'low', label: 'Low', count: 0 },
        { key: 'high', label: 'High', count: 0 },
      ]);
    });
  });
});
