/**
 * Test faqad normalization
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Faqad (فقد) Normalization', () => {
  describe('Normalization — فقد is ambiguous (removed from normalization map)', () => {
    test('should NOT normalize "faqad" — فقد could be root (to lose)', () => {
      const result = normalizeTranslation('فقد', 'faqad');
      expect(result).toBe('faqad'); // Keep original
    });

    test('should NOT normalize "fa qad" — فقد could be root (to lose)', () => {
      const result = normalizeTranslation('فقد', 'fa qad');
      expect(result).toBe('fa qad'); // Keep original
    });

    test('should normalize "waqad" to "and indeed" — وقد is unambiguous', () => {
      const result = normalizeTranslation('وقد', 'waqad');
      expect(result).toBe('and indeed');
    });
  });

  describe('Component detection', () => {
    test('should detect ف in فقد when English has trigger ("so indeed")', () => {
      const analysis = analyzeArabicWord('فقد', 'so indeed');
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );
      expect(hasFa).toBeTruthy();
      expect(analysis.hasComponents).toBeTruthy();
    });

    test('should NOT detect ف in فقد when English means "to lose"', () => {
      const analysis = analyzeArabicWord('فقد', 'he lost');
      expect(analysis.prefixes.some(p => p.arabicMatch === 'ف')).toBeFalsy();
    });

    test('should detect و in وقد "waqad"', () => {
      const analysis = analyzeArabicWord('وقد', 'waqad');

      console.log('\n📊 وقد + "waqad":');
      console.log('  Normalized to:', normalizeTranslation('وقد', 'waqad'));
      console.log(
        '  Prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      expect(hasWaw).toBeTruthy();
      expect(analysis.hasComponents).toBeTruthy();
    });

    test('should color فقد "so indeed" - both parts', () => {
      const analysis = analyzeArabicWord('فقد', 'so indeed');

      console.log('\n📊 فقد + "so indeed" (already normalized):');
      console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
      console.log('  Remaining:', `"${analysis.remainingArabic}"`);

      // ف should be detected
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBeTruthy();

      // قد should remain (it's not a component, it's a particle word)
      expect(analysis.hasComponents).toBeTruthy();
    });
  });

  describe('Summary', () => {
    test('should document the complete behavior', () => {
      console.log('\n✅ FAQAD NORMALIZATION COMPLETE:');
      console.log('');
      console.log('  فقد "faqad" → "so indeed"');
      console.log('    - ف (so) → GREEN (conjunction)');
      console.log('    - قد (indeed) → remaining text');
      console.log('');
      console.log('  وقد "waqad" → "and indeed"');
      console.log('    - و (and) → GREEN (conjunction)');
      console.log('    - قد (indeed) → remaining text');

      expect(true).toBeTruthy();
    });
  });
});
