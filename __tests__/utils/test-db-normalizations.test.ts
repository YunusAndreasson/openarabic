/**
 * Test that actual database translations normalize correctly
 */

import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Database Translation Normalizations', () => {
  describe('فإن (fa + in)', () => {
    test('should normalize "for" to "so indeed"', () => {
      const result = normalizeTranslation('فإن', 'for');
      expect(result).toBe('so indeed');
    });

    test('should detect ف in فإن "for"', () => {
      const analysis = analyzeArabicWord('فإن', 'for');
      expect(analysis.hasComponents).toBeTruthy();
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBeTruthy();
    });
  });

  describe('فقد — ambiguous: ف+قد (so indeed) OR root فقد (to lose)', () => {
    // فقد is NOT normalized because it's also a common root word (to lose/miss).
    // When the English contains "so" or "then", ف still matches directly without normalization.
    it('should NOT normalize (ambiguous root word)', () => {
      expect(normalizeTranslation('فقد', 'and so')).toBe('and so');
      expect(normalizeTranslation('فقد', 'then')).toBe('then');
      expect(normalizeTranslation('فقد', 'he lost')).toBe('he lost');
    });

    it('should still detect ف when English has matching triggers', () => {
      // "so indeed" — ف matches "so", قد matches "indeed"
      const a = analyzeArabicWord('فقد', 'so indeed');
      expect(a.hasComponents).toBeTruthy();
      expect(a.prefixes.some(p => p.arabicMatch === 'ف')).toBeTruthy();

      // "then he" — ف matches "then"
      const b = analyzeArabicWord('فقد', 'then he');
      expect(b.hasComponents).toBeTruthy();
    });

    it('should NOT detect ف when English has no matching triggers', () => {
      // "he lost" — no trigger for ف, and قد is a root letter
      const a = analyzeArabicWord('فقد', 'he lost');
      expect(a.prefixes.some(p => p.arabicMatch === 'ف')).toBeFalsy();
    });
  });

  describe('فما (fa + ma)', () => {
    const translations = ['so what', 'nor anything', 'so not'];

    translations.forEach(translation => {
      it(`should normalize "${translation}" to "so what"`, () => {
        const result = normalizeTranslation('فما', translation);
        expect(result).toBe('so what');
      });

      it(`should detect ف in فما "${translation}"`, () => {
        const analysis = analyzeArabicWord('فما', translation);
        expect(analysis.hasComponents).toBeTruthy();
        const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
        expect(hasFa).toBeTruthy();
      });
    });
  });

  describe('ولا (wa + la)', () => {
    test('should normalize "nor" to "and not"', () => {
      const result = normalizeTranslation('ولا', 'nor');
      expect(result).toBe('and not');
    });

    test('should normalize "and not" to "and not"', () => {
      const result = normalizeTranslation('ولا', 'and not');
      expect(result).toBe('and not');
    });

    test('should detect و in ولا "nor"', () => {
      const analysis = analyzeArabicWord('ولا', 'nor');
      expect(analysis.hasComponents).toBeTruthy();
      const hasWaw = analysis.prefixes.some(p => p.arabicMatch === 'و');
      expect(hasWaw).toBeTruthy();
    });
  });
});
