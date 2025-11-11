/**
 * Test for alef wasla (ٱ) normalization and definite article detection
 *
 * Bug: Words with alef wasla "ٱ" (U+0671) are not detected as having
 * definite article because shouldInjectBracket checks for regular alef "ا" (U+0627)
 *
 * Example: "ٱلْعِبَرِ" (al-'ibar - the lessons)
 * - Has alef wasla: ٱ
 * - Followed by: ل
 * - This is the definite article "ال" (al - "the")
 *
 * Alef wasla is an orthographic variant used in certain contexts
 * (typically for the definite article when not sentence-initial).
 * It should normalize to regular alef for analysis purposes.
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord, shouldInjectBracket } from '@/utils/arabicWordAnalysis';

describe('Alef wasla normalization', () => {
  test('should detect alef wasla ٱ in normalizeArabic', () => {
    // The word with alef wasla
    const wordWithWasla = 'ٱلعبر'; // alef wasla + lam
    const wordWithRegular = 'العبر'; // regular alef + lam

    // After normalization, they should be identical
    const analysis1 = analyzeArabicWord(wordWithWasla, 'lessons');
    const analysis2 = analyzeArabicWord(wordWithRegular, 'lessons');

    // Both should have same normalized form
    expect(analysis1.remainingArabic).toBe(analysis2.remainingArabic);
  });

  test('should inject bracket for ٱل (alef wasla + lam)', () => {
    // Word with alef wasla: ٱلعبر
    const wordWithWasla = 'ٱلعبر';

    // Normalization happens inside analyzeArabicWord, which then calls shouldInjectBracket
    // Let's test via analyzeArabicWord to ensure end-to-end behavior
    const analysis = analyzeArabicWord(wordWithWasla, 'lessons');

    // Should recognize as definite article and set bracket injection flag
    expect(analysis.hasBracketInjection).toBe(true);
  });

  test('should detect ال prefix with alef wasla in ٱلْعِبَرِ', () => {
    // Single-word "lessons" triggers bracket injection flag
    const singleWordAnalysis = analyzeArabicWord('ٱلعبر', 'lessons');
    expect(singleWordAnalysis.hasBracketInjection).toBe(true);

    // With bracket injection applied ("[the] lessons"), it becomes multi-word
    // and component detection should work
    const multiWordAnalysis = analyzeArabicWord('ٱلعبر', '[the] lessons');

    // Should detect ال as prefix after normalization
    expect(multiWordAnalysis.prefixes).toHaveLength(1);
    expect(multiWordAnalysis.prefixes[0]?.arabicMatch).toBe('ال');

    // Remaining should be "عبر"
    expect(multiWordAnalysis.remainingArabic).toBe('عبر');
  });

  test('should handle compound prefixes with alef wasla: بٱل', () => {
    // bi + al with alef wasla: بٱلعبر (with the lessons)
    const analysis = analyzeArabicWord('بٱلعبر', 'with the lessons');

    // Should detect both prefixes
    expect(analysis.prefixes).toHaveLength(2);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
    expect(analysis.prefixes[1]?.arabicMatch).toBe('ال');

    // Remaining should be "عبر"
    expect(analysis.remainingArabic).toBe('عبر');
  });

  test('should inject bracket even with alef wasla', () => {
    // Test via analyzeArabicWord which handles normalization internally
    const analysis1 = analyzeArabicWord('ٱلعبر', 'lessons');
    const analysis2 = analyzeArabicWord('ٱلعبر', 'the lessons');

    // Should inject "[the]" for "lessons" (no "the" in English)
    expect(analysis1.hasBracketInjection).toBe(true);

    // Should NOT inject for "the lessons" (already has "the")
    expect(analysis2.hasBracketInjection).toBe(false);
  });
});
