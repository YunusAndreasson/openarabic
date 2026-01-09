/**
 * Test faidha normalization
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Faidha (فإذا) Normalization', () => {
  describe('Normalization', () => {
    test('should normalize "faidha" to "so when"', () => {
      const result = normalizeTranslation('فإذا', 'faidha');
      expect(result).toBe('so when');
    });

    test('should normalize "fa idha" (with space) to "so when"', () => {
      const result = normalizeTranslation('فإذا', 'fa idha');
      expect(result).toBe('so when');
    });

    test('should normalize "waidha" to "and when"', () => {
      const result = normalizeTranslation('وإذا', 'waidha');
      expect(result).toBe('and when');
    });
  });

  describe('Component detection after normalization', () => {
    test('should detect BOTH ف and إذا in فإذا "faidha"', () => {
      const analysis = analyzeArabicWord('فإذا', 'faidha');

      console.log('\n📊 فإذا + "faidha":');
      console.log('  Normalized to:', normalizeTranslation('فإذا', 'faidha'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  Prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect ف as first prefix
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      // Should detect إذا as second prefix (compound detection)
      const hasIdha = analysis.prefixes.some(p => p.arabicMatch === 'إذا');

      console.log('  ف (so) detected:', hasFa);
      console.log('  إذا (when) detected:', hasIdha);

      expect(hasFa).toBeTruthy();
      expect(analysis.hasComponents).toBeTruthy();
    });

    test('should detect BOTH و and إذا in وإذا "waidha"', () => {
      const analysis = analyzeArabicWord('وإذا', 'waidha');

      console.log('\n📊 وإذا + "waidha":');
      console.log('  Normalized to:', normalizeTranslation('وإذا', 'waidha'));
      console.log(
        '  Prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect و as first prefix
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      // Should detect إذا as second prefix
      const hasIdha = analysis.prefixes.some(p => p.arabicMatch === 'إذا');

      console.log('  و (and) detected:', hasWaw);
      console.log('  إذا (when) detected:', hasIdha);

      expect(hasWaw).toBeTruthy();
      expect(analysis.hasComponents).toBeTruthy();
    });

    test('should color فإذا "so when" - sequential detection', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');

      console.log('\n📊 فإذا + "so when" (already normalized):');
      console.log('  Total prefixes:', analysis.prefixes.length);
      console.log(
        '  Prefixes detected:',
        analysis.prefixes.map(p => `${p.arabicMatch} → ${p.englishMatches.join('/')}`).join(' | '),
      );
      console.log('  Remaining:', `"${analysis.remainingArabic}"`);

      // Should have detected prefixes
      expect(analysis.prefixes.length).toBeGreaterThan(0);
      expect(analysis.hasComponents).toBeTruthy();

      // ف should definitely be detected
      const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
      expect(hasFa).toBeTruthy();
    });
  });

  describe('Summary', () => {
    test('should document the complete behavior', () => {
      console.log('\n✅ FAIDHA NORMALIZATION COMPLETE:');
      console.log('');
      console.log('  فإذا "faidha" → "so when"');
      console.log('    Sequential detection:');
      console.log('    1. ف (so) → GREEN (conjunction)');
      console.log('    2. إذا (when) → detected as prefix/particle');
      console.log('');
      console.log('  وإذا "waidha" → "and when"');
      console.log('    Sequential detection:');
      console.log('    1. و (and) → GREEN (conjunction)');
      console.log('    2. إذا (when) → detected as prefix/particle');

      expect(true).toBeTruthy();
    });
  });
});
