/**
 * Test that "nor" displays as "and not" in the UI
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Nor UI Display', () => {
  test('should return normalized English in original.english for UI display', () => {
    const analysis = analyzeArabicWord('ولا', 'nor');

    expect(analysis.original.english).toBe('and not');
  });

  test('should work for all normalization patterns', () => {
    const tests = [
      { arabic: 'ولا', input: 'nor', expected: 'and not' },
      { arabic: 'ولا', input: 'wa la', expected: 'and not' },
      { arabic: 'فلا', input: 'fa la', expected: 'so not' },
      { arabic: 'فما', input: 'fama', expected: 'so what' },
      { arabic: 'وما', input: 'wama', expected: 'and what' },
      { arabic: 'فهو', input: 'fahuwa', expected: 'so he' },
    ];

    tests.forEach(({ arabic, input, expected }) => {
      const analysis = analyzeArabicWord(arabic, input);
      expect(analysis.original.english).toBe(expected);
    });
  });
});
