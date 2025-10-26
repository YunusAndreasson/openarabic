/**
 * Test for false positive ف prefix detection in فَرْج (private parts)
 *
 * Bug: "وَفَرْجُهُ" (and his private parts) is incorrectly analyzed as:
 *   - Prefix: و (and)
 *   - Prefix: ف (FALSE POSITIVE - matched "and")
 *   - Root: رج (wrong)
 *   - Suffix: ه (his)
 *
 * Expected: Should be analyzed as:
 *   - Prefix: و (and)
 *   - Root: فرج (private parts)
 *   - Suffix: ه (his)
 *
 * Root cause: "ف" has "and" in its English patterns, causing it to match
 * even though "و" already consumed "and". The "ف" here is the first letter
 * of the root "فرج" (farj), not a conjunction.
 */

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

describe('False positive ف detection in فرج', () => {
  it('should NOT detect ف as prefix in وَفَرْجُهُ', () => {
    const analysis = analyzeArabicWord('وفرجه', 'and his private parts');

    // Should detect only ONE prefix: و (and)
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    expect(analysis.prefixes[0]?.englishMatches).toContain('and');

    // Should detect suffix: ه (his)
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.suffix?.englishMatches).toContain('his');

    // Remaining should be "فرج" (private parts), NOT "رج"
    expect(analysis.remainingArabic).toBe('فرج');
    expect(analysis.remainingEnglish).toBe('private parts');

    // Generate colored segments
    const mockColors = {
      primary: '#6a7f72', // conjunction
      violet: '#b28fef', // possessive
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const segments = computeColoredSegments('وفرجه', 'and his private parts', mockColors);

    // Should have 3 segments: prefix + root + suffix
    expect(segments).toHaveLength(3);

    // First segment: و (prefix)
    expect(segments[0]?.type).toBe('prefix');
    expect(segments[0]?.text).toMatch(/و/); // May have diacritics

    // Second segment: فرج (root) - should include ف!
    const rootSegment = segments.find(s => s.type === 'root');
    expect(rootSegment).toBeDefined();
    expect(rootSegment?.text).toMatch(/فرج/); // Root should include ف

    // Third segment: ه (suffix)
    expect(segments[2]?.type).toBe('suffix');
    expect(segments[2]?.text).toMatch(/ه/);
  });

  it('should detect ف as conjunction in actual conjunction contexts', () => {
    // ف should still work as a conjunction when it's actually a conjunction
    const analysis = analyzeArabicWord('فقال', 'so he said');

    // Should detect ف as prefix with conjunction role
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
    expect(analysis.prefixes[0]?.role).toBe('conjunction');
  });
});
