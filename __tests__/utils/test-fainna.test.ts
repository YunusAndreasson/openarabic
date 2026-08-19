/**
 * Test fainna normalization
 */

import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Fainna (فإن) Normalization', () => {
  test('should normalize "fainna" to "so indeed"', () => {
    const result = normalizeTranslation('فإن', 'fainna');
    expect(result).toBe('so indeed');
  });

  test('should detect ف in فإن "fainna"', () => {
    const analysis = analyzeArabicWord('فإن', 'fainna');

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['ف', 'إن']);
    expect(analysis.prefixes[0]?.englishMatches).toContain('so');
    expect(analysis.hasComponents).toBe(true);
  });

  test('should display "so indeed" in UI', () => {
    const analysis = analyzeArabicWord('فإن', 'fainna');
    expect(analysis.original.english).toBe('so indeed');
  });
});
