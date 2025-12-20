/**
 * Investigation of "fahuwa" pattern
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Fahuwa Pattern Investigation', () => {
  describe('Current behavior WITH normalization', () => {
    it('should analyze فهو with "fahuwa" - components NOW detected after normalization', () => {
      const analysis = analyzeArabicWord('فهو', 'fahuwa');

      // "fahuwa" is NOW normalized to "so he", so ف IS detected!
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      expect(hasFa).toBe(true);
      expect(analysis.original.english).toBe('so he'); // Normalized to "so he"
    });

    it('should analyze فهو with "so he" - components SHOULD be detected', () => {
      const analysis = analyzeArabicWord('فهو', 'so he');

      // With proper translation, we expect ف (so) to be detected
      // Note: هو (he) is a pronoun, may or may not be detected depending on rules

      // Check if ف is detected
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      // فهو = "so he" is a conjunction + pronoun = pure particle combination
      // According to isPureParticleCombination, this should have hasComponents=false
      // BUT we should still detect ف as a prefix

      expect(hasFa).toBe(true); // ف should be detected
      expect(analysis.original.arabic).toBe('فهو');
    });
  });

  describe('Similar pronoun patterns', () => {
    const patterns = [
      { arabic: 'فهو', english: 'fahuwa', normalized: 'so he', description: 'ف (so) + هو (he)' },
      { arabic: 'وهو', english: 'wahuwa', normalized: 'and he', description: 'و (and) + هو (he)' },
      { arabic: 'فهي', english: 'fahiya', normalized: 'so she', description: 'ف (so) + هي (she)' },
      {
        arabic: 'وهي',
        english: 'wahiya',
        normalized: 'and she',
        description: 'و (and) + هي (she)',
      },
      { arabic: 'فهم', english: 'fahum', normalized: 'so they', description: 'ف (so) + هم (they)' },
      {
        arabic: 'وهم',
        english: 'wahum',
        normalized: 'and they',
        description: 'و (and) + هم (they)',
      },
    ];

    patterns.forEach(pattern => {
      it(`should check ${pattern.arabic} "${pattern.english}"`, () => {
        const analysis = analyzeArabicWord(pattern.arabic, pattern.english);

        console.log(`\n📊 ${pattern.arabic} + "${pattern.english}":`);
        console.log('  hasComponents:', analysis.hasComponents);
        console.log('  Suggested normalization:', pattern.normalized);
        console.log('  Description:', pattern.description);

        // Just logging for investigation
        expect(pattern.arabic).toBeTruthy();
      });
    });
  });

  describe('Normalization rules for pronoun combinations', () => {
    it('should normalize "fahuwa" to "so he"', () => {
      const result = normalizeTranslation('فهو', 'fahuwa');
      expect(result).toBe('so he');
    });

    it('should normalize "fa huwa" (with space) to "so he"', () => {
      const result = normalizeTranslation('فهو', 'fa huwa');
      expect(result).toBe('so he');
    });

    it('should normalize "wahuwa" to "and he"', () => {
      const result = normalizeTranslation('وهو', 'wahuwa');
      expect(result).toBe('and he');
    });

    it('should normalize "fahiya" to "so she"', () => {
      const result = normalizeTranslation('فهي', 'fahiya');
      expect(result).toBe('so she');
    });

    it('should normalize "wahiya" to "and she"', () => {
      const result = normalizeTranslation('وهي', 'wahiya');
      expect(result).toBe('and she');
    });

    it('should normalize "fahum" to "so they"', () => {
      const result = normalizeTranslation('فهم', 'fahum');
      expect(result).toBe('so they');
    });

    it('should normalize "wahum" to "and they"', () => {
      const result = normalizeTranslation('وهم', 'wahum');
      expect(result).toBe('and they');
    });
  });

  describe('Component detection after normalization', () => {
    it('should detect components for فهو after normalizing "fahuwa"', () => {
      const analysis = analyzeArabicWord('فهو', 'fahuwa');

      // After normalization, "fahuwa" → "so he"
      // ف (so) should be detected as a prefix
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      expect(hasFa).toBe(true);
    });

    it('should detect components for وهو after normalizing "wahuwa"', () => {
      const analysis = analyzeArabicWord('وهو', 'wahuwa');

      // After normalization, "wahuwa" → "and he"
      // و (and) should be detected as a prefix
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      expect(hasWaw).toBe(true);
    });
  });
});
