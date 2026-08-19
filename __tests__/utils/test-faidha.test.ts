import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('فإذا / وإذا normalization', () => {
  test.each([
    ['فإذا', 'faidha', 'so when'],
    ['فإذا', 'fa idha', 'so when'],
    ['وإذا', 'waidha', 'and when'],
  ])('normalizes %s / %s to %s', (arabic, input, expected) => {
    expect(normalizeTranslation(arabic, input)).toBe(expected);
  });

  test.each([
    ['فإذا', 'faidha', ['ف', 'إذا']],
    ['فإذا', 'so when', ['ف', 'إذا']],
    ['وإذا', 'waidha', ['و', 'إذا']],
  ])('detects every component in %s / %s', (arabic, english, expectedPrefixes) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });
});
