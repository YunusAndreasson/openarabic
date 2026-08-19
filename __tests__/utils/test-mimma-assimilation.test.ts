import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('مِمَّا assimilation', () => {
  test.each(['مِمَّا', 'مما'])('detects one م prefix and leaves ما in %s', arabic => {
    const analysis = analyzeArabicWord(arabic, 'for what');

    expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['م']);
    expect(analysis.remainingArabic).toBe('ما');
    expect(analysis.hasComponents).toBe(true);
  });

  test('never recreates the assimilated consonant as a second prefix', () => {
    const analysis = analyzeArabicWord('مِمَّا', 'from the usage of');

    expect(analysis.prefixes.filter(prefix => prefix.arabicMatch === 'م')).toHaveLength(1);
    expect(analysis.remainingArabic).toBe('ما');
  });
});
