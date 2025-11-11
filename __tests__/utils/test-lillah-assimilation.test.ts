/**
 * Test for لِلَّهِ (lil-laahi = for God/Allah) assimilation bug
 *
 * Bug: The word is being analyzed as 3 segments with TWO lam prefixes:
 * - لِ (prefix, preposition)
 * - لّ (prefix, preposition AGAIN - WRONG)
 * - َهِ (root)
 *
 * Correct analysis: لِلَّهِ is ل + الله with assimilation
 * - ل (for) - preposition prefix
 * - لَّهِ (Allah with assimilated article ال)
 *
 * The shadda (ّ) on the second lam indicates the definite article ال
 * has been assimilated: ل + الله → لِلَّهِ (alif drops, lam doubles)
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('لِلَّهِ (for Allah) assimilation bug', () => {
  test('should NOT detect two lam prefixes in لِلَّهِ (for God)', () => {
    const arabic = 'لِلَّهِ';
    const english = 'for God';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect only ONE prefix: ل (for)
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');
    expect(analysis.prefixes[0]?.role).toBe(GrammaticalRole.PREPOSITION);

    // Should NOT detect a second lam prefix
    const lamPrefixes = analysis.prefixes.filter(p => p.arabicMatch === 'ل');
    expect(lamPrefixes.length).toBe(1);
  });

  test('should recognize لَّه as remaining after ل prefix (assimilated الله)', () => {
    const arabic = 'لِلَّهِ';
    const english = 'for God';

    const analysis = analyzeArabicWord(arabic, english);

    // After detecting ل prefix, should have لَّه remaining (Allah with assimilated article)
    // Note: The function normalizes, so we check the length is appropriate
    expect(analysis.remainingArabic.length).toBeGreaterThan(1);

    // Should not be just "ه" (which would indicate both lams were consumed as prefixes)
    expect(analysis.remainingArabic).not.toBe('ه');
  });

  test('should handle لِلَّهِ without diacritics', () => {
    const arabic = 'لله'; // Without diacritics
    const english = 'for God';

    const analysis = analyzeArabicWord(arabic, english);

    // Should still detect only ONE lam prefix
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');
  });

  test('should prevent لل (lil-) being detected as two preposition prefixes', () => {
    const arabic = 'لِلَّهِ';
    const english = 'for God';

    const analysis = analyzeArabicWord(arabic, english);

    // Count preposition prefixes - should be only 1
    const prepositionCount = analysis.prefixes.filter(
      p => p.role === GrammaticalRole.PREPOSITION,
    ).length;

    expect(prepositionCount).toBe(1);
    expect(prepositionCount).not.toBe(2); // Prevent the bug
  });

  test('should allow valid double-lam in different contexts like للبيت (for the house)', () => {
    const arabic = 'للبيت';
    const english = 'for the house';

    const analysis = analyzeArabicWord(arabic, english);

    // For regular nouns, ل + ال is valid
    // Should detect: ل (for) + ال (the)
    expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');

    // Should have root remaining (بيت = house)
    expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(2);
  });
});
