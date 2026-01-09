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

    console.log('\n📊 فإن + "fainna":');
    console.log('  Normalized to:', normalizeTranslation('فإن', 'fainna'));
    console.log('  hasComponents:', analysis.hasComponents);
    console.log(
      '  Prefixes:',
      analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
    );

    // Should detect ف as prefix
    const hasFa = analysis.prefixes.some(
      p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
    );

    expect(hasFa).toBeTruthy();
    expect(analysis.hasComponents).toBeTruthy();
  });

  test('should display "so indeed" in UI', () => {
    const analysis = analyzeArabicWord('فإن', 'fainna');
    expect(analysis.original.english).toBe('so indeed');
  });
});
