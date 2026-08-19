/**
 * Test "nor" normalization to "and not"
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Nor (ولا) Normalization', () => {
  test('should normalize "nor" to "and not"', () => {
    const result = normalizeTranslation('ولا', 'nor');
    expect(result).toBe('and not');
  });

  test('should detect و in ولا "nor"', () => {
    const analysis = analyzeArabicWord('ولا', 'nor');

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['و', 'لا']);
    expect(analysis.prefixes[0]?.englishMatches).toContain('and');
    expect(analysis.prefixes[1]?.englishMatches).toContain('not');
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.hasComponents).toBe(true);
  });
});
