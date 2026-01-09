/**
 * Test that pure particle combinations are NOW colored (filter disabled)
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Pure Particle Combinations - NOW COLORED', () => {
  describe('Pronoun combinations should be colored', () => {
    test('should color وهو "and he" (2 parts)', () => {
      const analysis = analyzeArabicWord('وهو', 'and he');

      console.log('\n📊 وهو + "and he":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect و (and)
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      expect(hasWaw).toBe(true);
      // With filter disabled, this should now have components
      expect(analysis.hasComponents).toBe(true);
    });

    test('should color وهو "and it" (2 parts)', () => {
      const analysis = analyzeArabicWord('وهو', 'and it');

      console.log('\n📊 وهو + "and it":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      expect(hasWaw).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    test('should color فهو "so he" (2 parts)', () => {
      const analysis = analyzeArabicWord('فهو', 'so he');

      console.log('\n📊 فهو + "so he":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      expect(hasFa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    test('should color فهو "so it is" (3 English words, 2 Arabic parts)', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n📊 فهو + "so it is":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      expect(hasFa).toBe(true);
      // 2 Arabic parts → should be colored
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Transliterations with normalization', () => {
    test('should color "wahuwa" after normalization to "and he"', () => {
      const analysis = analyzeArabicWord('وهو', 'wahuwa');

      console.log('\n📊 وهو + "wahuwa" (transliteration):');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // "wahuwa" → "and he" (via normalization)
      // و detected as prefix
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      expect(hasWaw).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });

    test('should color "fahuwa" after normalization to "so he"', () => {
      const analysis = analyzeArabicWord('فهو', 'fahuwa');

      console.log('\n📊 فهو + "fahuwa" (transliteration):');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      expect(hasFa).toBe(true);
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Single components should still NOT be colored', () => {
    test('should NOT color single component "لا" alone', () => {
      const analysis = analyzeArabicWord('لا', 'no');

      console.log('\n📊 لا + "no" (single component):');
      console.log('  hasComponents:', analysis.hasComponents);

      // Single word → no composition to show
      expect(analysis.hasComponents).toBe(false);
    });

    test('should NOT color single component "ف" alone', () => {
      const analysis = analyzeArabicWord('ف', 'so');

      console.log('\n📊 ف + "so" (single component):');
      console.log('  hasComponents:', analysis.hasComponents);

      // Single word → no composition to show
      expect(analysis.hasComponents).toBe(false);
    });
  });

  describe('Multi-part compositions should be colored', () => {
    test('should color ولا "and not" (2 detected prefixes)', () => {
      const analysis = analyzeArabicWord('ولا', 'and not');

      console.log('\n📊 ولا + "and not":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Both و and لا should be detected
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);
      expect(analysis.hasComponents).toBe(true);
    });
  });
});
