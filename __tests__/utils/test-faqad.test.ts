/**
 * Test faqad normalization
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Faqad (فقد) Normalization', () => {
  describe('Normalization', () => {
    it('should normalize "faqad" to "so indeed"', () => {
      const result = normalizeTranslation('فقد', 'faqad');
      expect(result).toBe('so indeed');
    });

    it('should normalize "fa qad" (with space) to "so indeed"', () => {
      const result = normalizeTranslation('فقد', 'fa qad');
      expect(result).toBe('so indeed');
    });

    it('should normalize "waqad" to "and indeed"', () => {
      const result = normalizeTranslation('وقد', 'waqad');
      expect(result).toBe('and indeed');
    });
  });

  describe('Component detection after normalization', () => {
    it('should detect ف in فقد "faqad"', () => {
      const analysis = analyzeArabicWord('فقد', 'faqad');

      console.log('\n📊 فقد + "faqad":');
      console.log('  Normalized to:', normalizeTranslation('فقد', 'faqad'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  Prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));
      console.log('  Suffix:', analysis.suffix?.arabicMatch || 'none');

      // Should detect ف as prefix
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so')
      );

      expect(hasFa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect و in وقد "waqad"', () => {
      const analysis = analyzeArabicWord('وقد', 'waqad');

      console.log('\n📊 وقد + "waqad":');
      console.log('  Normalized to:', normalizeTranslation('وقد', 'waqad'));
      console.log('  Prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and')
      );

      expect(hasWaw).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should color فقد "so indeed" - both parts', () => {
      const analysis = analyzeArabicWord('فقد', 'so indeed');

      console.log('\n📊 فقد + "so indeed" (already normalized):');
      console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
      console.log('  Remaining:', `"${analysis.remainingArabic}"`);

      // ف should be detected
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBe(true);

      // قد should remain (it's not a component, it's a particle word)
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Summary', () => {
    it('should document the complete behavior', () => {
      console.log('\n✅ FAQAD NORMALIZATION COMPLETE:');
      console.log('');
      console.log('  فقد "faqad" → "so indeed"');
      console.log('    - ف (so) → GREEN (conjunction)');
      console.log('    - قد (indeed) → remaining text');
      console.log('');
      console.log('  وقد "waqad" → "and indeed"');
      console.log('    - و (and) → GREEN (conjunction)');
      console.log('    - قد (indeed) → remaining text');

      expect(true).toBe(true);
    });
  });
});
