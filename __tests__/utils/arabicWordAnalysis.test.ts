import { analyzeArabicWord, formatWordAnalysis } from '../../utils/arabicWordAnalysis';

describe('arabicWordAnalysis', () => {
  // Test case for the user's initial report (ID 10214)
  it('should colorize "it" for "وَكِتَابَتِهِ"', () => {
    const analysis = analyzeArabicWord('وَكِتَابَتِهِ', 'and recording it');
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.suffix?.matchedInEnglish).toBe(true);
    expect(analysis.suffix?.englishMatches).toContain('it');
  });

  // Test case for the user's second report (ID 10308)
  it('should colorize both prefix and suffix for "مِنْهُمْ"', () => {
    const analysis = analyzeArabicWord('مِنْهُمْ', 'from them');
    const formatted = formatWordAnalysis(analysis);

    // 1. Check that both prefix and suffix are found
    expect(analysis.prefix?.arabicMatch).toBe('من');
    expect(analysis.suffix?.arabicMatch).toBe('هم');
    expect(analysis.hasComponents).toBe(true);

    // 2. Check that the reconstructed word has two colored parts
    const coloredSegments = formatted.reconstructedArabic?.segments.filter(
      s => s.colorName !== 'text'
    );
    expect(coloredSegments).toHaveLength(2);

    // 3. Check that the colored parts are correct
    const coloredTexts = coloredSegments?.map(s => s.text);
    expect(coloredTexts).toContain('مِن'); // Simplified: prefix mapping
    expect(coloredTexts).toContain('هُمْ'); // Suffix with diacritics
  });

  // General test for prefix + suffix
  it('should colorize both prefix and suffix for "وبيتها"', () => {
    const analysis = analyzeArabicWord('وبيتها', 'and her house');

    // Check that both prefix and suffix are found
    expect(analysis.prefix?.arabicMatch).toBe('و');
    expect(analysis.suffix?.arabicMatch).toBe('ها');
    expect(analysis.hasComponents).toBe(true);

    const formatted = formatWordAnalysis(analysis);
    const coloredSegments = formatted.reconstructedArabic?.segments.filter(
      s => s.colorName !== 'text'
    );
    expect(coloredSegments).toHaveLength(2);
  });

  // Test normalization
  it('should properly normalize Arabic text with diacritics', () => {
    const analysis = analyzeArabicWord('وَكِتَابَتِهِ', 'and recording it');
    expect(analysis.hasComponents).toBe(true);

    // Should preserve original text with diacritics in reconstruction
    const formatted = formatWordAnalysis(analysis);
    expect(formatted.reconstructedArabic?.totalText).toBe('وَكِتَابَتِهِ');
  });

  // Test that words without components are handled correctly
  it('should handle words without recognizable components', () => {
    const analysis = analyzeArabicWord('كتاب', 'book');
    expect(analysis.hasComponents).toBe(false);
    expect(analysis.prefix).toBeUndefined();
    expect(analysis.suffix).toBeUndefined();

    const formatted = formatWordAnalysis(analysis);
    expect(formatted.reconstructedArabic).toBeUndefined();
  });
});
