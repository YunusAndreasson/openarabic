/**
 * High-Risk Suffix Validation Edge Cases
 *
 * Tests for issue #6: Extend high-risk suffix validation to WITH-prefix cases
 * High-risk suffixes (ه, ها, ي, ك) can be confused with root letters.
 *
 * Phase 3: Conservative false positive fixes
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('High-Risk Suffix Validation', () => {
  describe('Without Prefix (Current Working Cases)', () => {
    test('كره → "he hated" should NOT detect ه as suffix (verb conjugation)', () => {
      const analysis = analyzeArabicWord('كره', 'he hated');

      // "he" is subject pronoun (verb conjugation), NOT object pronoun (suffix)
      // ه suffix typically means "his/her/it", not "he"
      // Therefore, ه should be REJECTED as a false positive
      expect(analysis.suffix).toBeUndefined();
      expect(analysis.remainingArabic).toBe('كره'); // Whole word is root
    });

    test('دمه → "his blood" SHOULD detect ه as suffix (possessive)', () => {
      const analysis = analyzeArabicWord('دمه', 'his blood');

      // "his" is possessive pronoun (legitimate suffix usage)
      // ه suffix englishMatches include "his"
      // Therefore, ه should be KEPT as valid suffix
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.englishMatches).toContain('his');
    });

    test('رآها → "he sees it" SHOULD detect ها as suffix (object pronoun)', () => {
      const analysis = analyzeArabicWord('رآها', 'he sees it');

      // "it" is object pronoun (legitimate suffix usage)
      // ها suffix englishMatches include "it/her"
      // "he" is subject (verb conjugation), ها only claims "it"
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ها');
      expect(analysis.suffix?.englishMatches.some(m => m.includes('it') || m.includes('her'))).toBe(
        true,
      );
    });
  });

  describe('With Prefix (NEW: Currently Broken, Should Fix)', () => {
    test('يكره → "he hates" should NOT detect ه as suffix when prefix exists', () => {
      const analysis = analyzeArabicWord('يكره', 'he hates');

      // Current behavior: Validation SKIPPED because prefix ي exists
      // Expected behavior: Validation should STILL RUN
      // "he" is subject pronoun (verb conjugation from prefix ي), NOT object pronoun
      // ه does NOT claim "he" in its englishMatches
      // Therefore, ه should be REJECTED as false positive

      // Prefix should be detected
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('ي');

      // Suffix should be REJECTED (this is the FIX)
      expect(analysis.suffix).toBeUndefined();
    });

    test('يكتبها → "he writes it" SHOULD detect ها as suffix even with prefix', () => {
      const analysis = analyzeArabicWord('يكتبها', 'he writes it');

      // Prefix ي exists ("he" = subject from verb prefix)
      // Suffix ها exists ("it" = object pronoun)
      // ها claims "it" in its englishMatches
      // Both prefix AND suffix should be detected

      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);

      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ها');
    });

    test('ودمه → "and his blood" SHOULD detect both و prefix and ه suffix', () => {
      const analysis = analyzeArabicWord('ودمه', 'and his blood');

      // Prefix و exists ("and" = conjunction)
      // Suffix ه exists ("his" = possessive)
      // ه claims "his" in its englishMatches
      // Both should be detected

      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('و');

      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.englishMatches).toContain('his');
    });
  });

  describe('Edge Case: Remaining Length Threshold', () => {
    test('short root + high-risk suffix should trigger validation', () => {
      // This tests that the validation threshold (< 3 chars) works correctly
      const analysis = analyzeArabicWord('كبه', 'he extinguished');

      // Root "كب" (2 chars) + suffix ه (1 char)
      // "he" is subject pronoun, NOT in ه's englishMatches
      // Should reject ه as false positive
      expect(analysis.suffix).toBeUndefined();
    });
  });
});
