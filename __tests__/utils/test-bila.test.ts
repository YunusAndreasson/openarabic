/**
 * Investigation of "bila" pattern (بلا = "with no" / "without")
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Bila Pattern Investigation (بلا)', () => {
  describe('Analyzing Arabic structure', () => {
    test('should break down بلا as ب + لا', () => {
      // بلا = ب (with) + لا (no/not) = "with no" or "without"
      const arabic = 'بلا';
      console.log(`\n📊 Analyzing: ${arabic}`);
      console.log('Expected breakdown: ب (with) + لا (no) = "with no" / "without"');
    });
  });

  describe('Current behavior', () => {
    test('should test بلا with transliteration "bila"', () => {
      const analysis = analyzeArabicWord('بلا', 'bila');

      console.log('\n📊 بلا + "bila" (transliteration):');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => ({
          arabic: p.arabicMatch,
          english: p.englishMatches,
          role: p.role,
        })),
      );

      // Normalization rule exists: بلا → "with no"
      expect(analysis.original.english).toBe('with no');
    });

    test('should test بلا with "with no"', () => {
      const analysis = analyzeArabicWord('بلا', 'with no');

      console.log('\n📊 بلا + "with no":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => ({
          arabic: p.arabicMatch,
          english: p.englishMatches,
          role: p.role,
        })),
      );

      // Check if ب is detected
      const hasBa = analysis.prefixes.some(
        p => p.arabicMatch === 'ب' && p.englishMatches.includes('with'),
      );

      // Check if لا is detected
      const hasLa = analysis.prefixes.some(
        p =>
          p.arabicMatch === 'لا' &&
          (p.englishMatches.includes('no') || p.englishMatches.includes('not')),
      );

      console.log('  ب (with) detected:', hasBa);
      console.log('  لا (no) detected:', hasLa);

      // At least ب should be detected
      expect(hasBa).toBe(true);
    });

    test('should test بلا with "without"', () => {
      const analysis = analyzeArabicWord('بلا', 'without');

      console.log('\n📊 بلا + "without":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => ({
          arabic: p.arabicMatch,
          english: p.englishMatches,
          role: p.role,
        })),
      );

      // New behavior: "without" gets normalized to "with no" (two words)
      // So it WILL be colored
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.original.english).toBe('with no');
    });
  });

  describe('Related patterns', () => {
    const patterns = [
      {
        arabic: 'فبلا',
        english: 'fabilaa',
        normalized: 'so with no',
        description: 'ف (so) + ب (with) + لا (no)',
      },
      {
        arabic: 'وبلا',
        english: 'wabilaa',
        normalized: 'and with no',
        description: 'و (and) + ب (with) + لا (no)',
      },
      { arabic: 'بلا', english: 'bilaa', normalized: 'with no', description: 'ب (with) + لا (no)' },
      {
        arabic: 'بلا',
        english: 'bi laa',
        normalized: 'with no',
        description: 'ب (with) + لا (no)',
      },
    ];

    patterns.forEach(pattern => {
      it(`should analyze ${pattern.arabic} "${pattern.english}"`, () => {
        const analysis = analyzeArabicWord(pattern.arabic, pattern.english);

        console.log(`\n📊 ${pattern.arabic} + "${pattern.english}":`);
        console.log('  Description:', pattern.description);
        console.log('  Suggested normalization:', pattern.normalized);
        console.log('  Components detected:', analysis.hasComponents);
        console.log(
          '  Prefixes:',
          analysis.prefixes
            .map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`)
            .join(', ') || 'none',
        );

        // Just for investigation
        expect(pattern.arabic).toBeTruthy();
      });
    });
  });

  describe('Normalization rules', () => {
    test('should normalize "bila" to "with no"', () => {
      const result = normalizeTranslation('بلا', 'bila');
      expect(result).toBe('with no');
    });

    test('should normalize "bilaa" to "with no"', () => {
      const result = normalizeTranslation('بلا', 'bilaa');
      expect(result).toBe('with no');
    });

    test('should normalize "bi laa" to "with no"', () => {
      const result = normalizeTranslation('بلا', 'bi laa');
      expect(result).toBe('with no');
    });

    test('should normalize "fabilaa" to "so with no"', () => {
      const result = normalizeTranslation('فبلا', 'fabilaa');
      expect(result).toBe('so with no');
    });

    test('should normalize "wabilaa" to "and with no"', () => {
      const result = normalizeTranslation('وبلا', 'wabilaa');
      expect(result).toBe('and with no');
    });
  });

  describe('Component detection after normalization', () => {
    test('should detect ب (with) after normalizing "bila"', () => {
      const analysis = analyzeArabicWord('بلا', 'bila');

      const hasBa = analysis.prefixes.some(
        p => p.arabicMatch === 'ب' && p.englishMatches.includes('with'),
      );

      expect(hasBa).toBe(true);
    });

    test('should detect لا (no) after normalizing "bila"', () => {
      const analysis = analyzeArabicWord('بلا', 'bila');

      const hasLa = analysis.prefixes.some(
        p =>
          p.arabicMatch === 'لا' &&
          (p.englishMatches.includes('no') || p.englishMatches.includes('not')),
      );

      expect(hasLa).toBe(true);
    });

    test('should detect separate components for بلا', () => {
      const analysis = analyzeArabicWord('بلا', 'bila');

      // Should have at least 2 prefixes: ب and لا
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);

      // Find the components
      const baPrefix = analysis.prefixes.find(p => p.arabicMatch === 'ب');
      const laPrefix = analysis.prefixes.find(p => p.arabicMatch === 'لا');

      expect(baPrefix).toBeDefined();
      expect(laPrefix).toBeDefined();

      // They should be different components (different colors)
      expect(baPrefix?.role).not.toBe(laPrefix?.role);
    });
  });

  describe('Recommendation', () => {
    test('should document recommendation for bila pattern', () => {
      console.log('\n💡 RECOMMENDATION:');
      console.log('');
      console.log('Based on analysis, "bila" should be added to normalization rules:');
      console.log('');
      console.log('{');
      console.log("  arabic: 'بلا',");
      console.log("  transliterations: ['bila', 'bi laa', 'bilaa', 'bi la'],");
      console.log("  normalizedEnglish: 'with no',");
      console.log("  description: 'ب (with) + لا (no)',");
      console.log('},');
      console.log('');
      console.log('This will enable:');
      console.log('  - ب (with) detected as PREPOSITION (orange)');
      console.log('  - لا (no) detected as NEGATION (olive)');
      console.log('  - Educational coloring showing the composition');

      expect(true).toBe(true);
    });
  });
});
