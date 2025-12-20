/**
 * Test newly added normalization rules
 */

import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('New Normalization Rules', () => {
  describe('فمن (fa + man)', () => {
    it('should normalize to "so whoever"', () => {
      expect(normalizeTranslation('فمن', 'so whoever')).toBe('so whoever');
      expect(normalizeTranslation('فمن', 'so among')).toBe('so whoever');
    });

    it('should detect ف prefix', () => {
      const analysis = analyzeArabicWord('فمن', 'anything');
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBe(true);
    });
  });

  describe('ومن (wa + man)', () => {
    it('should normalize to "and whoever"', () => {
      expect(normalizeTranslation('ومن', 'and whoever')).toBe('and whoever');
      expect(normalizeTranslation('ومن', 'and among')).toBe('and whoever');
    });

    it('should detect و prefix', () => {
      const analysis = analyzeArabicWord('ومن', 'anything');
      const hasWaw = analysis.prefixes.some(p => p.arabicMatch === 'و');
      expect(hasWaw).toBe(true);
    });
  });

  describe('بما (bi + ma)', () => {
    it('should normalize to "with what"', () => {
      expect(normalizeTranslation('بما', 'with what')).toBe('with what');
      expect(normalizeTranslation('بما', 'concerning what')).toBe('with what');
    });

    it('should detect ب prefix', () => {
      const analysis = analyzeArabicWord('بما', 'anything');
      const hasBa = analysis.prefixes.some(p => p.arabicMatch === 'ب');
      expect(hasBa).toBe(true);
    });
  });
});
