/**
 * Subject Marker Semantic Validation
 *
 * Tests for issue #7: Require subject pronoun in English for ي/ت/ن/أ detection
 * Subject markers (ي، ت، ن، أ) indicate verb conjugation and should only be detected
 * when corresponding subject pronouns exist in English.
 *
 * Phase 3: Conservative false positive fixes
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Subject Marker Semantic Validation', () => {
  describe('False Positives: Subject markers when English has no subject pronoun', () => {
    test('يوم → "day" should NOT detect ي prefix (ي is root letter)', () => {
      const analysis = analyzeArabicWord('يوم', 'day');

      // "day" has no subject pronoun ("he", "it", etc.)
      // ي is part of the root (ي-و-م), not a subject marker prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('يوم');
    });

    test('تمر → "dates" should NOT detect ت prefix (ت is root letter)', () => {
      const analysis = analyzeArabicWord('تمر', 'dates');

      // "dates" has no subject pronoun ("you", "she", etc.)
      // ت is part of the root (ت-م-ر), not a subject marker prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('تمر');
    });

    test('نور → "light" should NOT detect ن prefix (ن is root letter)', () => {
      const analysis = analyzeArabicWord('نور', 'light');

      // "light" has no subject pronoun ("we")
      // ن is part of the root (ن-و-ر), not a subject marker prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('نور');
    });

    test('أسد → "lion" should NOT detect أ prefix (أ is root letter)', () => {
      const analysis = analyzeArabicWord('أسد', 'lion');

      // "lion" has no subject pronoun ("I")
      // أ is part of the root (أ-س-د), not a subject marker prefix
      expect(analysis.prefixes).toEqual([]);
      expect(analysis.remainingArabic).toBe('أسد');
    });
  });

  describe('True Positives: Subject markers when English has subject pronoun', () => {
    test('يكتب → "he writes" SHOULD detect ي prefix (verb conjugation)', () => {
      const analysis = analyzeArabicWord('يكتب', 'he writes');

      // "he" is subject pronoun matching ي prefix
      // ي is legitimate subject marker for 3rd person masculine
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('ي');
    });

    test('تكتب → "she writes" SHOULD detect ت prefix (verb conjugation)', () => {
      const analysis = analyzeArabicWord('تكتب', 'she writes');

      // "she" is subject pronoun matching ت prefix
      // ت is legitimate subject marker for 3rd person feminine
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('ت');
    });

    test('نكتب → "we write" SHOULD detect ن prefix (verb conjugation)', () => {
      const analysis = analyzeArabicWord('نكتب', 'we write');

      // "we" is subject pronoun matching ن prefix
      // ن is legitimate subject marker for 1st person plural
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('ن');
    });

    test('أكتب → "I write" SHOULD detect أ prefix (verb conjugation)', () => {
      const analysis = analyzeArabicWord('أكتب', 'I write');

      // "I" is subject pronoun matching أ prefix
      // أ is legitimate subject marker for 1st person singular
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBeGreaterThan(0);
      expect(analysis.prefixes?.[0]?.arabicMatch).toBe('أ');
    });
  });

  describe('Edge Cases: Auxiliary verbs and complex conjugations', () => {
    test('يكون → "it is" SHOULD detect ي prefix (auxiliary verb)', () => {
      const analysis = analyzeArabicWord('يكون', 'it is');

      // "it" can be subject pronoun for inanimate objects
      // ي is legitimate for 3rd person singular
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ي')).toBe(true);
    });

    test('تصبح → "you become" SHOULD detect ت prefix (2nd person)', () => {
      const analysis = analyzeArabicWord('تصبح', 'you become');

      // "you" is subject pronoun matching ت prefix
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ت')).toBe(true);
    });
  });

  describe('With Other Prefixes: Subject markers combined with و/ف', () => {
    test('ويكتب → "and he writes" SHOULD detect both و and ي prefixes', () => {
      const analysis = analyzeArabicWord('ويكتب', 'and he writes');

      // و = "and" (conjunction)
      // ي = "he" (subject marker)
      expect(analysis.prefixes).toBeDefined();
      expect(analysis.prefixes?.length).toBe(2);
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'و')).toBe(true);
      expect(analysis.prefixes?.some(p => p.arabicMatch === 'ي')).toBe(true);
    });

    // Note: Some word combinations may not match due to specific validation rules
    // The core validation (preventing false positives) is tested above
  });
});
