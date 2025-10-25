/**
 * Test for "whose" as a valid translation of Arabic suffix "ه"
 *
 * Enhancement: Added "whose" to the possessive suffix "ه" patterns
 * to handle constructions like "وَلِسَانُهُ" (and whose tongue)
 */

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

describe('"whose" suffix detection', () => {
  it('should detect ه suffix with "whose" in وَلِسَانُهُ', () => {
    const analysis = analyzeArabicWord('ولسانه', 'and whose tongue');

    // Should detect prefix: و (and)
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    expect(analysis.prefixes[0]?.englishMatches).toContain('and');

    // Should detect suffix: ه (whose)
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.suffix?.englishMatches).toContain('whose');
    expect(analysis.suffix?.role).toBe('possessive');

    // Remaining should be "لسان" (tongue)
    expect(analysis.remainingArabic).toBe('لسان');
    expect(analysis.remainingEnglish).toBe('tongue');

    // Generate colored segments
    const mockColors = {
      primary: '#6a7f72', // conjunction
      violet: '#b28fef', // possessive
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const segments = computeColoredSegments('ولسانه', 'and whose tongue', mockColors);

    // Should have 3 segments: prefix + root + suffix
    expect(segments).toHaveLength(3);

    // Verify all three component types are present
    const types = segments.map(s => s.type);
    expect(types).toContain('prefix');
    expect(types).toContain('root');
    expect(types).toContain('suffix');

    // First segment: و (prefix)
    const prefixSegment = segments.find(s => s.type === 'prefix');
    expect(prefixSegment).toBeDefined();
    expect(prefixSegment?.text).toMatch(/و/);

    // Second segment: لسان (root)
    const rootSegment = segments.find(s => s.type === 'root');
    expect(rootSegment).toBeDefined();
    expect(rootSegment?.text).toMatch(/لسان/);

    // Third segment: ه (suffix) - should be possessive color from grammar colors
    const suffixSegment = segments.find(s => s.type === 'suffix');
    expect(suffixSegment).toBeDefined();
    expect(suffixSegment?.text).toMatch(/ه/);
    expect(suffixSegment?.color).toBe(MOCK_GRAMMAR_COLORS.possessive);
  });

  it('should still work with traditional "his" translation', () => {
    const analysis = analyzeArabicWord('كتابه', 'his book');

    // Should detect suffix: ه (his)
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.suffix?.englishMatches).toContain('his');
    expect(analysis.remainingArabic).toBe('كتاب');
  });

  it('should color "whose" in English translation', () => {
    const mockColors = {
      violet: '#b28fef',
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const analysis = analyzeArabicWord('بيته', 'whose house');
    const formatted = require('@/utils/arabicWordAnalysis').formatWordAnalysis(analysis);

    const { generateColorCodedSegments } = require('@/utils/colorCodedTextUtils');
    const segments = generateColorCodedSegments({
      text: 'whose house',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Find "whose" segment
    const whoseSegment = segments.find(s => s.text === 'whose');
    expect(whoseSegment).toBeDefined();
    expect(whoseSegment?.color).toBe(MOCK_GRAMMAR_COLORS.possessive);
  });
});
