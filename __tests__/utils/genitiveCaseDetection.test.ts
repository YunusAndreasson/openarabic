/**
 * Genitive Case Detection (ب Preposition)
 *
 * Tests for issue #8: Add "of"-only check for ب rejection
 * When English contains "of" but NOT "with/by/in", it likely indicates
 * genitive case construction, not the ب preposition prefix.
 *
 * Phase 3: Conservative false positive fixes
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Genitive Case Detection', () => {
  describe('False Positives: ب detected when English shows genitive case', () => {
    test('بيت → "house of" should NOT detect ب prefix (genitive case)', () => {
      const analysis = analyzeArabicWord('بيت', 'house of');

      // "of" indicates genitive case (construct state in Arabic)
      // NO "with/by/in" preposition meanings present
      // ب is part of root (ب-ي-ت = house), not a prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('بيت');
    });

    test('بئر → "well of" should NOT detect ب prefix (genitive case)', () => {
      const analysis = analyzeArabicWord('بئر', 'well of');

      // "of" indicates genitive case
      // ب is part of root (ب-ء-ر = well), not a prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('بئر');
    });

    test('بحر → "sea of" should NOT detect ب prefix (genitive case)', () => {
      const analysis = analyzeArabicWord('بحر', 'sea of');

      // "of" indicates genitive case
      // ب is part of root (ب-ح-ر = sea), not a prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('بحر');
    });
  });

  describe('True Positives: ب detected when English shows preposition meaning', () => {
    test('بالله → "by Allah" SHOULD detect ب prefix (preposition "by")', () => {
      const analysis = analyzeArabicWord('بالله', 'by Allah');

      // "by" is a legitimate ب preposition meaning
      // ب is a prefix, not part of root
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ب')).toBe(true);
    });

    test('بكم → "with you" SHOULD detect ب prefix (preposition "with")', () => {
      const analysis = analyzeArabicWord('بكم', 'with you');

      // "with" is a legitimate ب preposition meaning
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ب')).toBe(true);
    });

    test('بهذا → "in this" SHOULD detect ب prefix (preposition "in")', () => {
      const analysis = analyzeArabicWord('بهذا', 'in this');

      // "in" is a legitimate ب preposition meaning
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ب')).toBe(true);
    });
  });

  describe('Edge Cases: Mixed prepositions and genitive', () => {
    test('English with both "of" and "by" should detect ب (preposition wins)', () => {
      const analysis = analyzeArabicWord('بمنزلة', 'by way of');

      // Contains both "by" (preposition) and "of" (genitive)
      // "by" indicates ب is legitimate preposition
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ب')).toBe(true);
    });
  });

  describe('Root words: ب is genuinely part of root', () => {
    test('باب → "door" should NOT detect ب prefix (ب is root letter)', () => {
      const analysis = analyzeArabicWord('باب', 'door');

      // No "of/with/by/in" indicators
      // ب is clearly part of root (ب-و-ب = door)
      expect(analysis.prefixes).toEqual([]);
    });

    test('بصل → "onion" should NOT detect ب prefix (ب is root letter)', () => {
      const analysis = analyzeArabicWord('بصل', 'onion');

      // ب is part of root (ب-ص-ل = onion)
      expect(analysis.prefixes).toEqual([]);
    });
  });
});
