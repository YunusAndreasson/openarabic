/**
 * Test that standalone pronouns are now detected as suffixes
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Pronoun Suffix Detection', () => {
  test('should detect هو as suffix in فهو "fahuwa"', () => {
    const analysis = analyzeArabicWord('فهو', 'fahuwa');

    console.log('\n📊 فهو + "fahuwa":');
    console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
    console.log('  Suffix:', analysis.suffix?.arabicMatch || 'none');
    console.log('  Remaining:', `"${analysis.remainingArabic}"`);

    // Should detect ف as prefix
    const hasFa = analysis.prefixes.some(p => p.arabicMatch === 'ف');
    expect(hasFa).toBeTruthy();

    // Should detect هو as suffix (NEW!)
    expect(analysis.suffix).toBeDefined();
    expect(analysis.suffix?.arabicMatch).toBe('هو');
  });

  test('should detect هو as suffix in وهو "and he"', () => {
    const analysis = analyzeArabicWord('وهو', 'and he');

    console.log('\n📊 وهو + "and he":');
    console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
    console.log('  Suffix:', analysis.suffix?.arabicMatch || 'none');

    // Should detect و as prefix
    const hasWaw = analysis.prefixes.some(p => p.arabicMatch === 'و');
    expect(hasWaw).toBeTruthy();

    // Should detect هو as suffix (NEW!)
    expect(analysis.suffix).toBeDefined();
    expect(analysis.suffix?.arabicMatch).toBe('هو');
  });

  test('should color BOTH parts: ف AND هو', () => {
    const analysis = analyzeArabicWord('فهو', 'so he');

    console.log('\n🎨 فهو + "so he" - BOTH PARTS COLORED:');
    console.log('  Prefix: ف (so)');
    console.log('  Suffix: هو (he)');
    console.log('  hasComponents:', analysis.hasComponents);

    // Both components detected
    expect(analysis.prefixes.length).toBeGreaterThan(0);
    expect(analysis.suffix).toBeDefined();
    expect(analysis.hasComponents).toBeTruthy();

    // Remaining should be empty (all consumed by components)
    expect(analysis.remainingArabic).toBe('');
  });

  test('should detect هي as suffix in فهي "so she"', () => {
    const analysis = analyzeArabicWord('فهي', 'so she');

    console.log('\n📊 فهي + "so she":');
    console.log('  Suffix:', analysis.suffix?.arabicMatch || 'none');

    expect(analysis.suffix?.arabicMatch).toBe('هي');
  });

  test('should detect هم as suffix in وهم "and they"', () => {
    const analysis = analyzeArabicWord('وهم', 'and they');

    console.log('\n📊 وهم + "and they":');
    console.log('  Suffix:', analysis.suffix?.arabicMatch || 'none');

    expect(analysis.suffix?.arabicMatch).toBe('هم');
  });
});
