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
      expect(analysis.hasComponents).toBe(true);
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBe(true);
    });
  });

  describe('فقد (fa + qad)', () => {
    const translations = ['and so', 'then', 'then indeed', 'so has', 'as he has', 'so indeed'];

    translations.forEach(translation => {
      it(`should normalize "${translation}" to "so indeed"`, () => {
        const result = normalizeTranslation('فقد', translation);
        expect(result).toBe('so indeed');
      });

      it(`should detect ف in فقد "${translation}"`, () => {
        const analysis = analyzeArabicWord('فقد', translation);
        expect(analysis.hasComponents).toBe(true);
        const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
        expect(hasFa).toBe(true);
      });
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
        expect(analysis.hasComponents).toBe(true);
        const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
        expect(hasFa).toBe(true);
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
      expect(analysis.hasComponents).toBe(true);
      const hasWaw = analysis.prefixes.some(p => p.arabicMatch === 'و');
      expect(hasWaw).toBe(true);
    });
  });
});
