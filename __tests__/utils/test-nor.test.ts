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

    console.log('\n📊 ولا + "nor":');
    console.log('  Normalized to:', normalizeTranslation('ولا', 'nor'));
    console.log('  hasComponents:', analysis.hasComponents);
    console.log(
      '  Prefixes:',
      analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
    );

    // Should detect و as prefix
    const hasWaw = analysis.prefixes.some(
      p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
    );

    console.log('  و (and) detected:', hasWaw);

    expect(hasWaw).toBeTruthy();
    expect(analysis.hasComponents).toBeTruthy();
  });

  test('should color ولا "nor" after normalization', () => {
    const analysis = analyzeArabicWord('ولا', 'nor');

    console.log('\n📊 ولا + "nor" coloring:');
    console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
    console.log('  Remaining:', `"${analysis.remainingArabic}"`);

    // و should be detected
    const hasWaw = analysis.prefixes.some(p => p.arabicMatch === 'و');
    expect(hasWaw).toBeTruthy();
    expect(analysis.hasComponents).toBeTruthy();
  });
});
