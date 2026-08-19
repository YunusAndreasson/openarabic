import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('بلا normalization and composition', () => {
  test.each([
    ['بلا', 'bila', 'with no'],
    ['بلا', 'bilaa', 'with no'],
    ['بلا', 'bi laa', 'with no'],
    ['بلا', 'without', 'with no'],
    ['فبلا', 'fabilaa', 'so with no'],
    ['وبلا', 'wabilaa', 'and with no'],
  ])('normalizes %s / %s to %s', (arabic, input, expected) => {
    expect(normalizeTranslation(arabic, input)).toBe(expected);
  });

  test.each([
    ['بلا', 'bila', ['ب', 'لا']],
    ['بلا', 'without', ['ب', 'لا']],
    ['فبلا', 'fabilaa', ['ف', 'ب', 'لا']],
    ['وبلا', 'wabilaa', ['و', 'ب', 'لا']],
  ])('detects each component in %s / %s', (arabic, english, expectedPrefixes) => {
    const analysis = analyzeArabicWord(arabic, english);

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(expectedPrefixes);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });

  test('assigns ب and لا different grammatical roles', () => {
    const analysis = analyzeArabicWord('بلا', 'with no');

    expect(analysis.prefixes[0]?.role).not.toBe(analysis.prefixes[1]?.role);
  });
});
