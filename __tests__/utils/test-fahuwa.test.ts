import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Arabic conjunction + pronoun transliterations', () => {
  test.each([
    ['فهو', 'fahuwa', 'so he'],
    ['فهو', 'fa huwa', 'so he'],
    ['وهو', 'wahuwa', 'and he'],
    ['فهي', 'fahiya', 'so she'],
    ['وهي', 'wahiya', 'and she'],
  ])('normalizes %s / %s to %s', (arabic, input, expected) => {
    expect(normalizeTranslation(arabic, input)).toBe(expected);
  });

  test.each([
    ['فهو', 'fahuwa', 'ف', 'هو'],
    ['وهو', 'wahuwa', 'و', 'هو'],
    ['فهي', 'fahiya', 'ف', 'هي'],
    ['وهي', 'wahiya', 'و', 'هي'],
    ['وهم', 'and they', 'و', 'هم'],
  ])('detects both components in %s / %s', (arabic, english, prefix, suffix) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(component => component.arabicMatch)).toEqual([prefix]);
    expect(analysis.suffix?.arabicMatch).toBe(suffix);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });

  test.each([
    ['فهم', 'fahum'],
    ['وهم', 'wahum'],
  ])('does not normalize ambiguous transliteration %s / %s', (arabic, input) => {
    expect(normalizeTranslation(arabic, input)).toBe(input);
  });
});
