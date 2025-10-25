/**
 * Test for ب detection in بِمُلازَمَةِ (to adhere to)
 *
 * Issue: ب is not being detected as a prefix in this word
 *
 * Word structure:
 * - ب (bi) - preposition "with/by"
 * - ملازمة (mulazama) - verbal noun "adherence/sticking"
 *
 * Translation: "to adhere to" (idiomatic)
 *
 * The challenge is that "to" in English can be:
 * 1. Infinitive marker ("to adhere")
 * 2. Prepositional complement ("adhere TO something")
 *
 * Neither directly corresponds to ب, which means "with/by" in Arabic.
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('ب detection patterns', () => {
  it('should detect ب with literal translation "with adherence"', () => {
    const analysis = analyzeArabicWord('بملازمة', 'with adherence');

    // Should detect ب prefix
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
    expect(analysis.prefixes[0]?.englishMatches).toContain('with');

    // Remaining should be "ملازمة"
    expect(analysis.remainingArabic).toBe('ملازمة');
  });

  it('should NOT detect ب with idiomatic "to adhere to"', () => {
    const analysis = analyzeArabicWord('بملازمة', 'to adhere to');

    // ب should NOT match because "to" is not in its patterns
    // and adding "to" would cause false positives with infinitives
    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.hasComponents).toBe(false);
  });

  it('should detect ب with "by adhering to"', () => {
    // Alternative translation that includes "by"
    const analysis = analyzeArabicWord('بملازمة', 'by adhering to');

    // Should detect ب prefix with "by"
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
    expect(analysis.prefixes[0]?.englishMatches).toContain('by');
  });

  it('should NOT detect ب with idiomatic "from Allah"', () => {
    const analysis = analyzeArabicWord('بالله', 'from Allah');

    // ب should NOT match because "from" is not in its patterns
    // "from" is من (min), not ب (bi)
    // ب = "with/by", so "with Allah" or "by Allah" would match
    // "from Allah" is idiomatic (e.g., "seek refuge from evil BY invoking Allah")
    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.hasComponents).toBe(false);
  });

  it('should detect ب with literal "with Allah" but preserve Allah as divine name', () => {
    const analysis = analyzeArabicWord('بالله', 'with Allah');

    // Should detect only ب prefix
    // "الله" (Allah) is a divine name where ال is inseparable from the name
    // The divine name protection prevents splitting "Allah" into "ال" + "له"
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
    expect(analysis.prefixes[0]?.englishMatches).toContain('with');

    // Remaining should be "الله" (Allah) as a complete divine name
    expect(analysis.remainingArabic).toBe('الله');
  });
});
