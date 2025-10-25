/**
 * Test for مِمَّا (mimma = from what/that which) assimilation bug
 *
 * Bug: The word was being analyzed as 3 segments with TWO meem prefixes:
 * - م (prefix, preposition)
 * - م (prefix, preposition AGAIN - WRONG)
 * - ا (root - only 1 letter, clearly wrong!)
 *
 * Correct analysis: مِمَّا is من + ما with assimilation
 * - من (min) = "from" - preposition
 * - ما (ma) = "what/that which" - interrogative/relative particle
 *
 * The shadda (ّ) on the second م indicates the ن from من has assimilated:
 * من + ما → مِمَّا (the ن becomes the shadda doubling the م)
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('مِمَّا (from what) assimilation bug', () => {
  it('DEBUG: show what مِمَّا analysis produces', () => {
    const tests = [
      { arabic: 'مِمَّا', english: 'from what' },
      { arabic: 'مما', english: 'from what' },
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

  it('should detect components for multi-word translation "from what"', () => {
    const arabic = 'مِمَّا';
    const english = 'from what';

    const analysis = analyzeArabicWord(arabic, english);

    // "from what" is 2 words, single-word rule should NOT apply
    expect(analysis.hasComponents).toBe(true);

    // Should have at least one prefix detected
    expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);

    // Must have remaining root (not empty)
    expect(analysis.remainingArabic).not.toBe('');
    expect(analysis.remainingArabic.length).toBeGreaterThan(0);
  });

  it('should NOT detect two meem prefixes in مِمَّا (from what)', () => {
    const arabic = 'مِمَّا';
    const english = 'from what';

    const analysis = analyzeArabicWord(arabic, english);

    // Count how many م prefixes were detected
    const meemPrefixes = analysis.prefixes.filter(p => p.arabicMatch === 'م');

    // Should NOT detect م twice
    expect(meemPrefixes.length).toBeLessThanOrEqual(1);
    expect(meemPrefixes.length).not.toBe(2); // Prevent the bug
  });

  it('should detect م prefix and leave ما as remaining', () => {
    const arabic = 'مِمَّا';
    const english = 'from what';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect م (shortened من due to assimilation) as prefix
    const hasMeemPrefix = analysis.prefixes.some(p => p.arabicMatch === 'م');
    expect(hasMeemPrefix).toBe(true);

    // Should leave ما (what) as remaining root
    expect(analysis.remainingArabic).toBe('ما');
  });

  it('should NOT consume entire word as prefixes', () => {
    const arabic = 'مِمَّا';
    const english = 'from what';

    const analysis = analyzeArabicWord(arabic, english);

    // Must have non-empty remaining after prefix detection
    expect(analysis.remainingArabic).not.toBe('');
    expect(analysis.remainingArabic.length).toBeGreaterThan(0);
  });

  it('should handle مِمَّا without diacritics', () => {
    const arabic = 'مما'; // Without diacritics
    const english = 'from what';

    const analysis = analyzeArabicWord(arabic, english);

    // Should still not detect double مم
    const meemPrefixes = analysis.prefixes.filter(p => p.arabicMatch === 'م');
    expect(meemPrefixes.length).toBeLessThanOrEqual(1);
  });

  it('should prevent مما being analyzed as م + م + root', () => {
    const arabic = 'مِمَّا';
    const english = 'from the usage of';

    const analysis = analyzeArabicWord(arabic, english);

    // Count preposition prefixes with arabicMatch === 'م'
    const singleMeemCount = analysis.prefixes.filter(p => p.arabicMatch === 'م').length;

    // Should be 0 or 1, NOT 2
    expect(singleMeemCount).toBeLessThanOrEqual(1);
  });
});
