/**
 * Test for البال (al-baal = the mind) greedy prefix detection bug
 *
 * Bug: The word was being incorrectly analyzed as 3 prefixes with no root:
 * - ال (definite article)
 * - ب (preposition)
 * - ال (definite article again - IMPOSSIBLE!)
 *
 * Fix: Added validation to prevent:
 * 1. Duplicate definite articles (only ONE ال per word - Arabic grammar rule)
 * 2. Consuming entire word as prefixes (must leave minimum 2-char root)
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

describe('البال greedy prefix detection bug', () => {
  test('should NOT detect ال twice in البال (the mind)', () => {
    const arabic = 'البال';
    const english = 'of the mind';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect only ONE prefix: ال (definite article)
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ال');
    expect(analysis.prefixes[0]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);

    // Should have a root remaining: بال (mind)
    expect(analysis.remainingArabic).toBe('بال');
    expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(2);
  });

  test('should prevent second definite article detection', () => {
    const arabic = 'البال';
    const english = 'the mind';

    const analysis = analyzeArabicWord(arabic, english);

    // Count how many definite articles were detected
    const articleCount = analysis.prefixes.filter(
      p => p.role === GrammaticalRole.DEFINITE_ARTICLE,
    ).length;

    // Arabic grammar: only ONE definite article per word
    expect(articleCount).toBe(1);
    expect(articleCount).not.toBe(2); // Prevent the bug
  });

  test('should ensure minimum root remains after prefix detection', () => {
    const arabic = 'البال';
    const english = 'the mind';

    const analysis = analyzeArabicWord(arabic, english);

    // After all prefix detection, must have at least 2 characters remaining
    expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(2);

    // The word should NOT be entirely consumed by prefixes
    expect(analysis.remainingArabic).not.toBe('');
  });

  test('should handle البال with genitive case marker', () => {
    const arabic = 'الْبَالِ'; // With diacritics and genitive kasra
    const english = 'of the mind';

    const analysis = analyzeArabicWord(arabic, english);

    // Should still detect only one prefix
    expect(analysis.prefixes.length).toBeLessThanOrEqual(1);

    // Should have root
    expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(2);
  });

  test('should allow valid multi-prefix combinations like والبيت (and the house)', () => {
    const arabic = 'والبيت';
    const english = 'and the house';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect TWO prefixes: و + ال
    expect(analysis.prefixes).toHaveLength(2);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    expect(analysis.prefixes[1]?.arabicMatch).toBe('ال');

    // Should have root: بيت (house)
    expect(analysis.remainingArabic).toBe('بيت');
  });
});
