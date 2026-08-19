/**
 * Investigation: Why isn't "fahuwa" colored when translated as "so it is"?
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('فهو composition', () => {
  test('normalizes the transliteration to an analyzable translation', () => {
    expect(normalizeTranslation('فهو', 'fahuwa')).toBe('so he');
  });

  test.each(['fahuwa', 'so he', 'so it', 'so it is'])(
    'detects ف and retains هو for the translation %s',
    english => {
      const analysis = analyzeArabicWord('فهو', english);

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['ف']);
      expect(analysis.prefixes[0]?.englishMatches).toContain('so');
      expect(analysis.suffix?.arabicMatch).toBe('هو');
      expect(analysis.remainingArabic).toBe('');
    },
  );

  test.each([
    ['فهو', 'so it is', ['ف'], 'هو'],
    ['وهو', 'and he', ['و'], 'هو'],
    ['ولا', 'and not', ['و', 'لا'], undefined],
  ])('colors the particle composition %s', (arabic, english, expectedPrefixes, expectedSuffix) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.hasComponents).toBe(true);
    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.suffix?.arabicMatch).toBe(expectedSuffix);
    expect(analysis.remainingArabic).toBe('');
  });
});
