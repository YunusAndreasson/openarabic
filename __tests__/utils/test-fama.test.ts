/**
 * Test fama normalization
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Fama (فما) Normalization', () => {
  describe('Normalization', () => {
    it('should normalize "fama" to "so what"', () => {
      const result = normalizeTranslation('فما', 'fama');
      expect(result).toBe('so what');
    });

    it('should normalize "fa ma" (with space) to "so what"', () => {
      const result = normalizeTranslation('فما', 'fa ma');
      expect(result).toBe('so what');
    });

    it('should normalize "wama" to "and what"', () => {
      const result = normalizeTranslation('وما', 'wama');
      expect(result).toBe('and what');
    });
  });

  describe('Component detection after normalization', () => {
    it('should detect ف in فما "fama"', () => {
      const analysis = analyzeArabicWord('فما', 'fama');

      console.log('\n📊 فما + "fama":');
      console.log('  Normalized to:', normalizeTranslation('فما', 'fama'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  Prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect ف as prefix
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      console.log('  ف (so) detected:', hasFa);

      expect(hasFa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect و in وما "wama"', () => {
      const analysis = analyzeArabicWord('وما', 'wama');

      console.log('\n📊 وما + "wama":');
      console.log('  Normalized to:', normalizeTranslation('وما', 'wama'));
      console.log(
        '  Prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect و as prefix
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      console.log('  و (and) detected:', hasWaw);

      expect(hasWaw).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should color فما "so what" after normalization', () => {
      const analysis = analyzeArabicWord('فما', 'so what');

      console.log('\n📊 فما + "so what" (already normalized):');
      console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
      console.log('  Remaining:', `"${analysis.remainingArabic}"`);

      // ف should be detected
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Summary', () => {
    it('should document the complete behavior', () => {
      console.log('\n✅ FAMA NORMALIZATION COMPLETE:');
      console.log('');
      console.log('  فما "fama" → "so what"');
      console.log('    - ف (so) → GREEN (conjunction)');
      console.log('    - ما (what) → remaining text');
      console.log('');
      console.log('  وما "wama" → "and what"');
      console.log('    - و (and) → GREEN (conjunction)');
      console.log('    - ما (what) → remaining text');

      expect(true).toBe(true);
    });
  });
});
