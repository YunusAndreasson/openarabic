/**
 * Test for remainingEnglish calculation bug
 *
 * Bug: remainingEnglish was set to the entire original English translation
 * instead of removing the words matched by prefixes/suffixes.
 *
 * This caused English color-coding to fail because the root section would
 * claim ALL English words, overriding prefix/suffix coloring.
 *
 * Example: "الكتاب" (the book)
 * - Prefix: "ال" matches "the"
 * - Root: "كتاب"
 * - remainingEnglish should be "book" (not "the book")
 *
 * Note: الذي was the original example here, but الذي is a fused relative pronoun
 * (FUSED_AL_WORDS) whose ال is deliberately NOT detected as a prefix anymore.
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
  test('should remove prefix words from English in الكتاب (the book)', () => {
    const analysis = analyzeArabicWord('الكتاب', 'the book of guidance');

    // Prefix "ال" matches "the"
    expect(analysis.prefixes[0]?.englishMatches).toContain('the');

    // Remaining English should NOT include "the"
    expect(analysis.remainingEnglish).not.toContain('the');
    expect(analysis.remainingEnglish.toLowerCase()).toContain('book');
  });

  test('fused relative pronoun الذي must NOT decompose into ال + ذي', () => {
    // الذي is a fossilized relative pronoun (FUSED_AL_WORDS) — its ال is not a
    // separable article, so nothing should be detected even with "the" present.
    const analysis = analyzeArabicWord('الذي', 'the one who');
    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.hasComponents).toBe(false);
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
    expect(hasWawPrefix).toBeTruthy();

    // Suffix "ه" matches "his"
    expect(analysis.suffix?.englishMatches).toContain('his');

    // Remaining English should be just "book"
    expect(analysis.remainingEnglish.toLowerCase()).toBe('book');
  });

  test('single-word rule leaves standalone في unanalyzed', () => {
    const analysis = analyzeArabicWord('في', 'in');

    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.hasComponents).toBe(false);
    expect(analysis.remainingArabic).toBe('في');
    expect(analysis.remainingEnglish).toBe('in');
  });
});
