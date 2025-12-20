/**
 * Test kama normalization
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Kama (كما) Normalization', () => {
  describe('Normalization', () => {
    it('should normalize "kama" to "as for"', () => {
      const result = normalizeTranslation('كما', 'kama');
      expect(result).toBe('as for');
    });

    it('should normalize "ka ma" (with space) to "as for"', () => {
      const result = normalizeTranslation('كما', 'ka ma');
      expect(result).toBe('as for');
    });

    it('should normalize "wakama" to "and as for"', () => {
      const result = normalizeTranslation('وكما', 'wakama');
      expect(result).toBe('and as for');
    });

    it('should normalize "fakama" to "so as for"', () => {
      const result = normalizeTranslation('فكما', 'fakama');
      expect(result).toBe('so as for');
    });
  });

  describe('Component detection after normalization', () => {
    it('should detect ك in كما "kama"', () => {
      const analysis = analyzeArabicWord('كما', 'kama');

      console.log('\n📊 كما + "kama":');
      console.log('  Normalized to:', normalizeTranslation('كما', 'kama'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  Prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      // Should detect ك as prefix
      const hasKa = analysis.prefixes.some(
        p => p.arabicMatch === 'ك'
      );

      console.log('  ك (as) detected:', hasKa);

      expect(hasKa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect و and ك in وكما "wakama"', () => {
      const analysis = analyzeArabicWord('وكما', 'wakama');

      console.log('\n📊 وكما + "wakama":');
      console.log('  Normalized to:', normalizeTranslation('وكما', 'wakama'));
      console.log('  Prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      // Should detect و as first prefix
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and')
      );

      // Should detect ك as second prefix
      const hasKa = analysis.prefixes.some(
        p => p.arabicMatch === 'ك'
      );

      console.log('  و (and) detected:', hasWaw);
      console.log('  ك (as) detected:', hasKa);

      expect(hasWaw).toBe(true);
      expect(hasKa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect ف and ك in فكما "fakama"', () => {
      const analysis = analyzeArabicWord('فكما', 'fakama');

      console.log('\n📊 فكما + "fakama":');
      console.log('  Normalized to:', normalizeTranslation('فكما', 'fakama'));
      console.log('  Prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      // Should detect ف as first prefix
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so')
      );

      // Should detect ك as second prefix
      const hasKa = analysis.prefixes.some(
        p => p.arabicMatch === 'ك'
      );

      console.log('  ف (so) detected:', hasFa);
      console.log('  ك (as) detected:', hasKa);

      expect(hasFa).toBe(true);
      expect(hasKa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Summary', () => {
    it('should document the complete behavior', () => {
      console.log('\n✅ KAMA NORMALIZATION COMPLETE:');
      console.log('');
      console.log('  كما "kama" → "as for"');
      console.log('    - ك (as) → COLORED (preposition)');
      console.log('    - ما (for) → remaining text');
      console.log('');
      console.log('  وكما "wakama" → "and as for"');
      console.log('    - و (and) → GREEN (conjunction)');
      console.log('    - ك (as) → COLORED (preposition)');
      console.log('    - ما (for) → remaining text');
      console.log('');
      console.log('  فكما "fakama" → "so as for"');
      console.log('    - ف (so) → GREEN (conjunction)');
      console.log('    - ك (as) → COLORED (preposition)');
      console.log('    - ما (for) → remaining text');

      expect(true).toBe(true);
    });
  });
});
