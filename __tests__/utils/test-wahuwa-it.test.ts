import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('وهو translation variants', () => {
  test('normalizes the transliteration before analyzing it', () => {
    expect(normalizeTranslation('وهو', 'wahuwa')).toBe('and he');

    const result = analyzeArabicWord('وهو', 'wahuwa');

    expect(result.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['و']);
    expect(result.suffix?.arabicMatch).toBe('هو');
    expect(result.hasComponents).toBe(true);
  });

  test.each(['and he', 'and it'])(
    'canonicalizes "%s" and colors both components',
    inputTranslation => {
      const result = analyzeArabicWord('وهو', inputTranslation);

      expect(result.original.english).toBe('and he');
      expect(result.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['و']);
      expect(result.prefixes[0]?.englishMatches).toContain('and');
      expect(result.suffix?.arabicMatch).toBe('هو');
      expect(result.suffix?.englishMatches).toContain('he');
      expect(result.remainingArabic).toBe('');
      expect(result.hasComponents).toBe(true);
    },
  );

  test('distinguishes conjunction-plus-pronoun from conjunction-plus-noun', () => {
    const pronoun = analyzeArabicWord('وهو', 'and it');
    const noun = analyzeArabicWord('والله', 'and by Allah');

    expect(pronoun.suffix?.arabicMatch).toBe('هو');
    expect(pronoun.remainingArabic).toBe('');
    expect(noun.suffix).toBeUndefined();
    expect(noun.remainingArabic).toBe('الله');
    expect(pronoun.hasComponents).toBe(true);
    expect(noun.hasComponents).toBe(true);
  });
});
