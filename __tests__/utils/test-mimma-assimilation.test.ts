/**
 * Test for مِمَّا (mimma = for what/that which) assimilation bug
 *
 * Bug: The word was being analyzed as 3 segments with TWO meem prefixes:
 * - م (prefix, preposition)
 * - م (prefix, preposition AGAIN - WRONG)
 * - ا (root - only 1 letter, clearly wrong!)
 *
 * Correct analysis: مِمَّا is من + ما with assimilation
 * - من (min) = "for/from" - preposition
 * - ما (ma) = "what/that which" - interrogative/relative particle
 *
 * The shadda (ّ) on the second م indicates the ن from من has assimilated:
 * من + ما → مِمَّا (the ن becomes the shadda doubling the م)
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

describe('مِمَّا (for what) assimilation bug', () => {
  test('DEBUG: show what مِمَّا analysis produces', () => {
    const tests = [
      { arabic: 'مِمَّا', english: 'for what' },
      { arabic: 'مما', english: 'for what' },
      { arabic: 'مِمَّا', english: 'from the usage of' },
      { arabic: 'من', english: 'from' }, // Test من alone
      { arabic: 'ما', english: 'what' }, // Test ما alone
    ];

    tests.forEach(({ arabic, english }) => {
      const analysis = analyzeArabicWord(arabic, english);
      console.log(`\n${arabic} → "${english}"`);
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes:', JSON.stringify(analysis.prefixes.map(p => p.arabicMatch)));
      console.log('  remaining:', analysis.remainingArabic);
    });
  });

  test('should detect components for multi-word translation "for what"', () => {
    const arabic = 'مِمَّا';
    const english = 'for what';

    const analysis = analyzeArabicWord(arabic, english);

    // "for what" is 2 words, single-word rule should NOT apply
    expect(analysis.hasComponents).toBeTruthy();

    // Should have at least one prefix detected
    expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);

    // Must have remaining root (not empty)
    expect(analysis.remainingArabic).not.toBe('');
    expect(analysis.remainingArabic.length).toBeGreaterThan(0);
  });

  test('should NOT detect two meem prefixes in مِمَّا (for what)', () => {
    const arabic = 'مِمَّا';
    const english = 'for what';

    const analysis = analyzeArabicWord(arabic, english);

    // Count how many م prefixes were detected
    const meemPrefixes = analysis.prefixes.filter(p => p.arabicMatch === 'م');

    // Should NOT detect م twice
    expect(meemPrefixes.length).toBeLessThanOrEqual(1);
    expect(meemPrefixes.length).not.toBe(2); // Prevent the bug
  });

  test('should detect م prefix and leave ما as remaining', () => {
    const arabic = 'مِمَّا';
    const english = 'for what';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect م (shortened من due to assimilation) as prefix
    const hasMeemPrefix = analysis.prefixes.some(p => p.arabicMatch === 'م');
    expect(hasMeemPrefix).toBeTruthy();

    // Should leave ما (what) as remaining root
    expect(analysis.remainingArabic).toBe('ما');
  });

  test('should NOT consume entire word as prefixes', () => {
    const arabic = 'مِمَّا';
    const english = 'for what';

    const analysis = analyzeArabicWord(arabic, english);

    // Must have non-empty remaining after prefix detection
    expect(analysis.remainingArabic).not.toBe('');
    expect(analysis.remainingArabic.length).toBeGreaterThan(0);
  });

  test('should handle مِمَّا without diacritics', () => {
    const arabic = 'مما'; // Without diacritics
    const english = 'for what';

    const analysis = analyzeArabicWord(arabic, english);

    // Should still not detect double مم
    const meemPrefixes = analysis.prefixes.filter(p => p.arabicMatch === 'م');
    expect(meemPrefixes.length).toBeLessThanOrEqual(1);
  });

  test('should prevent مما being analyzed as م + م + root', () => {
    const arabic = 'مِمَّا';
    const english = 'from the usage of';

    const analysis = analyzeArabicWord(arabic, english);

    // Count preposition prefixes with arabicMatch === 'م'
    const singleMeemCount = analysis.prefixes.filter(p => p.arabicMatch === 'م').length;

    // Should be 0 or 1, NOT 2
    expect(singleMeemCount).toBeLessThanOrEqual(1);
  });
});
