/**
 * The one spelling of the due count, shared by the tab badge and the practice
 * screen's lead card.
 */

import { describe, expect, test } from '@jest/globals';

import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { formatDueCount, isDueCountCapped } from '@/utils/dueCountText';

describe('formatDueCount', () => {
  test('prints an exact count as it is', () => {
    expect(formatDueCount(0)).toBe('0');
    expect(formatDueCount(23)).toBe('23');
    expect(formatDueCount(PRACTICE_DUE_WORDS_LIMIT - 1)).toBe(String(PRACTICE_DUE_WORDS_LIMIT - 1));
  });

  test('marks a count at the fetch limit as a floor', () => {
    // The query clips AT the limit, so a result of exactly that length cannot be
    // told apart from a longer one and must not be printed as a total.
    expect(formatDueCount(PRACTICE_DUE_WORDS_LIMIT)).toBe(`${PRACTICE_DUE_WORDS_LIMIT}+`);
  });
});

describe('isDueCountCapped', () => {
  test('turns exactly at the fetch limit', () => {
    expect(isDueCountCapped(PRACTICE_DUE_WORDS_LIMIT - 1)).toBe(false);
    expect(isDueCountCapped(PRACTICE_DUE_WORDS_LIMIT)).toBe(true);
  });
});
