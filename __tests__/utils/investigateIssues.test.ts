/**
 * Regression coverage for behavior originally found while investigating the
 * grammar benchmark. These tests intentionally assert the user-visible
 * decomposition instead of merely printing diagnostic output.
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Arabic word analysis benchmark regressions', () => {
  test.each([
    ['سيذهب', 'he will go', ['س', 'ي'], 'ذهب'],
    ['سوفيذهب', 'he will go', ['سوف', 'ي'], 'ذهب'],
    ['لايعرف', 'does not know', ['لا', 'ي'], 'عرف'],
    ['يكتب', 'he writes', ['ي'], 'كتب'],
  ])('%s exposes its tense/negation and subject markers', (arabic, english, prefixes, root) => {
    const result = analyzeArabicWord(arabic, english);

    expect(result.prefixes.map(prefix => prefix.arabicMatch)).toEqual(prefixes);
    expect(result.remainingArabic).toBe(root);
    expect(result.hasComponents).toBe(true);
  });

  test('Form X استطاع exposes the ست infix', () => {
    const result = analyzeArabicWord('استطاع', 'he sought to do');

    expect(result.prefixes).toEqual([]);
    expect(result.infix?.arabicMatch).toBe('ست');
    expect(result.suffix).toBeUndefined();
    expect(result.hasComponents).toBe(true);
  });

  test.each([
    ['لا', 'that does not'],
    ['لم', 'does not'],
    ['كم', 'how much'],
    ['من', 'who'],
    ['لولا', 'if not for'],
  ])('%s remains uncolored when it is a single standalone particle', (arabic, english) => {
    const result = analyzeArabicWord(arabic, english);

    expect(result.hasComponents).toBe(false);
  });

  test.each([
    ['وهو', 'and he', 'و', 'هو'],
    ['فهي', 'then she', 'ف', 'هي'],
  ])(
    '%s is colored as a conjunction plus pronoun',
    (arabic, english, expectedPrefix, expectedSuffix) => {
      const result = analyzeArabicWord(arabic, english);

      expect(result.prefixes.map(prefix => prefix.arabicMatch)).toEqual([expectedPrefix]);
      expect(result.suffix?.arabicMatch).toBe(expectedSuffix);
      expect(result.remainingArabic).toBe('');
      expect(result.hasComponents).toBe(true);
    },
  );
});
