/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { ARABIC_SUFFIXES } from '@/constants/arabicWordComponents';

describe('ARABIC_SUFFIXES sorting', () => {
  test('should be sorted by length (longest first)', () => {
    const actualLengths = ARABIC_SUFFIXES.map(suffix => suffix.arabic.length);
    const descendingLengths = [...actualLengths].sort((left, right) => right - left);

    expect(actualLengths).toEqual(descendingLengths);
  });

  test('should have longest suffixes first', () => {
    const first = ARABIC_SUFFIXES[0];
    const last = ARABIC_SUFFIXES[ARABIC_SUFFIXES.length - 1];

    expect(first?.arabic.length).toBeGreaterThanOrEqual(last?.arabic.length ?? 0);
  });
});
