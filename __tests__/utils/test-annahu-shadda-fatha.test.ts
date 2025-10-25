/**
 * Test for أَنَّهُ shadda + fatha coloring issue
 *
 * Bug: The fatha on top of the shadda (in نَّ) is being split into a separate segment
 * Expected: "أَنَّ" should all be one prefix segment (including the fatha on the shadda)
 * Actual: "أَنّ" (prefix) + "َ" (root) + "ه" (suffix) + "ُ" (diacritic)
 */

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

describe('أَنَّهُ shadda + fatha coloring', () => {
  it('should show what segments we actually get', () => {
    const mockColors = {
      info: '#3bacda',
      violet: '#b28fef',
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const segments = computeColoredSegments('أَنَّهُ', 'that it', mockColors);

    // Log each segment for debugging
    segments.forEach((seg, i) => {
      console.log(`Segment ${i}: type="${seg.type}", text="${seg.text}", chars=${seg.text.length}`);
    });

    // This test always passes - it's just for debugging
    expect(segments.length).toBeGreaterThan(0);
  });

  it('should keep shadda + fatha together in prefix for أَنَّهُ', () => {
    const analysis = analyzeArabicWord('أَنَّهُ', 'that it');

    // Analyze structure
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('أن'); // Normalized
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.remainingArabic).toBe('');

    // Generate colored segments
    const mockColors = {
      info: '#3bacda', // prefix (particle)
      violet: '#b28fef', // suffix (possessive)
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const segments = computeColoredSegments('أَنَّهُ', 'that it', mockColors);

    // CRITICAL: Should have 3 segments, NOT 4
    // Expected: [prefix: "أَنَّ", suffix: "ه", diacritic: "ُ"]
    // NOT: [prefix: "أَنّ", root: "َ", suffix: "ه", diacritic: "ُ"]

    // The fatha on the shadda should be PART OF THE PREFIX
    const prefixSegment = segments.find(s => s.type === 'prefix');
    expect(prefixSegment).toBeDefined();
    // Prefix should include BOTH shadda and fatha: "أَنَّ"
    expect(prefixSegment?.text).toBe('أَنَّ');

    // Should NOT have a root segment
    const rootSegments = segments.filter(s => s.type === 'root');
    expect(rootSegments).toHaveLength(0);

    // Should have suffix
    const suffixSegment = segments.find(s => s.type === 'suffix');
    expect(suffixSegment).toBeDefined();
    expect(suffixSegment?.text).toBe('ه');

    // Should have diacritic (damma on suffix)
    const diacriticSegment = segments.find(s => s.type === 'diacritic');
    expect(diacriticSegment).toBeDefined();
    expect(diacriticSegment?.text).toBe('ُ');

    // Total should be 3 segments
    expect(segments).toHaveLength(3);
  });
});
