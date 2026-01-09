/**
 * Test that "nor" displays as "and not" in the UI
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Nor UI Display', () => {
  test('should return normalized English in original.english for UI display', () => {
    const analysis = analyzeArabicWord('ولا', 'nor');

    console.log('\n📊 UI Display Test for ولا + "nor":');
    console.log('  Input English:', 'nor');
    console.log('  original.english:', analysis.original.english);
    console.log('  Expected:', 'and not');

    // The UI should display the NORMALIZED English, not the original "nor"
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
      console.log(`  ${arabic} + "${input}" → original.english: "${analysis.original.english}"`);
      expect(analysis.original.english).toBe(expected);
    });
  });
});
