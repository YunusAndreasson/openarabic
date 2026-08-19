import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('كما normalization', () => {
  test.each([
    ['كما', 'kama', 'as for'],
    ['كما', 'ka ma', 'as for'],
    ['وكما', 'wakama', 'and as for'],
    ['فكما', 'fakama', 'so as for'],
  ])('normalizes %s / %s to %s', (arabic, input, expected) => {
    expect(normalizeTranslation(arabic, input)).toBe(expected);
  });

  test.each([
    ['كما', 'kama', ['ك']],
    ['وكما', 'wakama', ['و', 'ك']],
    ['فكما', 'fakama', ['ف', 'ك']],
  ])('detects the supported components in %s / %s', (arabic, english, expectedPrefixes) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.remainingArabic).toBe('ما');
    expect(analysis.hasComponents).toBe(true);
  });
});
