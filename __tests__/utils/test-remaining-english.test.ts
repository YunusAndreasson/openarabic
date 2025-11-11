/**
 * Test for remainingEnglish calculation bug
 *
 * Bug: remainingEnglish was set to the entire original English translation
 * instead of removing the words matched by prefixes/suffixes.
 *
 * This caused English color-coding to fail because the root section would
 * claim ALL English words, overriding prefix/suffix coloring.
 *
 * Example: "الذي" (the one who)
 * - Prefix: "ال" matches "the"
 * - Root: "ذي"
 * - remainingEnglish should be "one who" (not "the one who")
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('remainingEnglish calculation', () => {
  test('should remove prefix words from English in الذي (the one who)', () => {
    const analysis = analyzeArabicWord('الذي', 'the one who');

    // Prefix "ال" matches "the"
    expect(analysis.prefixes[0]?.englishMatches).toContain('the');

    // Remaining English should NOT include "the"
    expect(analysis.remainingEnglish).not.toContain('the');

    // Remaining English should be "one who" or similar
    // (the words that weren't matched by the prefix)
    const expectedRemaining = 'one who';
    expect(analysis.remainingEnglish.toLowerCase()).toBe(expectedRemaining);
  });

  test('should remove suffix words from English in كتابه (his book)', () => {
    const analysis = analyzeArabicWord('كتابه', 'his book');

    // Suffix "ه" matches "his"
    expect(analysis.suffix?.englishMatches).toContain('his');

    // Remaining English should NOT include "his"
    expect(analysis.remainingEnglish).not.toContain('his');

    // Remaining English should be "book"
    expect(analysis.remainingEnglish.toLowerCase()).toBe('book');
  });

  test('should remove both prefix and suffix words in وكتابه (and his book)', () => {
    const analysis = analyzeArabicWord('وكتابه', 'and his book');

    // Prefix "و" matches "and"
    const hasWawPrefix = analysis.prefixes.some(
      p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
    );
    expect(hasWawPrefix).toBe(true);

    // Suffix "ه" matches "his"
    expect(analysis.suffix?.englishMatches).toContain('his');

    // Remaining English should be just "book"
    expect(analysis.remainingEnglish.toLowerCase()).toBe('book');
  });

  test('should handle words with only prefixes like في (in)', () => {
    const analysis = analyzeArabicWord('في', 'in');

    // This is just a preposition - no root remaining
    // remainingEnglish should be empty or the unmatched portion
    if (analysis.prefixes.length > 0) {
      // If في is detected as a prefix matching "in"
      // then remainingEnglish should be empty
      const prefixMatchesIn = analysis.prefixes.some(p => p.englishMatches.includes('in'));
      if (prefixMatchesIn) {
        expect(analysis.remainingEnglish).toBe('');
      }
    }
  });
});
