import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('فما / وما normalization', () => {
  test.each([
    ['فما', 'fama', 'so what'],
    ['فما', 'fa ma', 'so what'],
    ['وما', 'wama', 'and what'],
  ])('normalizes %s / %s to %s', (arabic, input, expected) => {
    expect(normalizeTranslation(arabic, input)).toBe(expected);
  });

  test.each([
    ['فما', 'fama', ['ف', 'ما']],
    ['فما', 'so what', ['ف', 'ما']],
    ['وما', 'wama', ['و', 'ما']],
  ])('detects every component in %s / %s', (arabic, english, expectedPrefixes) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });
});
