import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('فقد / وقد normalization', () => {
  test.each([
    ['فقد', 'faqad'],
    ['فقد', 'fa qad'],
  ])('does not normalize ambiguous %s / %s', (arabic, input) => {
    expect(normalizeTranslation(arabic, input)).toBe(input);
  });

  test('normalizes unambiguous وقد / waqad', () => {
    expect(normalizeTranslation('وقد', 'waqad')).toBe('and indeed');
  });

  test.each([
    ['فقد', 'so indeed', ['ف', 'قد']],
    ['وقد', 'waqad', ['و', 'قد']],
  ])('detects every component in %s / %s', (arabic, english, expectedPrefixes) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });

  test('does not split root-initial ف when فقد means "he lost"', () => {
    const analysis = analyzeArabicWord('فقد', 'he lost');

    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.remainingArabic).toBe('فقد');
  });
});
