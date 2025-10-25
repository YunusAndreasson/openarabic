/**
 * Test for English "the" coloring with coral color
 *
 * Bug: colorMapping in generateColorCodedSegments was missing 'coral' color
 * This caused ALL instances of "the" (from definite article ال) to not be colored
 *
 * Fix: Added coral (and other missing colors) to colorMapping
 */

import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

describe('English "the" coloring', () => {
  it('should color "the" with coral for الذي (the one who)', () => {
    const analysis = analyzeArabicWord('الذي', 'the one who');
    const formatted = formatWordAnalysis(analysis);

    const mockColors = {
      coral: '#e08b75', // Coral for definite article
      text: '#fcfffd', // Default text color
      grammar: MOCK_GRAMMAR_COLORS,
      // ... other colors would be here
    } as any;

    const segments = generateColorCodedSegments({
      text: 'the one who',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Should have at least 2 segments: "the" and "one who"
    expect(segments.length).toBeGreaterThanOrEqual(2);

    // Find the segment for "the"
    const theSegment = segments.find(s => s.text === 'the');
    expect(theSegment).toBeDefined();

    // Should be colored with definite article grammar color (not default text color!)
    expect(theSegment?.color).toBe(MOCK_GRAMMAR_COLORS.definiteArticle);
    expect(theSegment?.color).not.toBe('#fcfffd'); // NOT default text color
  });

  it('should color "the" for any word with ال prefix', () => {
    const testCases = [
      { arabic: 'الكتاب', english: 'the book' },
      { arabic: 'البيت', english: 'the house' },
      { arabic: 'القلم', english: 'the pen' },
    ];

    const mockColors = {
      coral: '#e08b75',
      text: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    testCases.forEach(({ arabic, english }) => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const segments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Find "the" segment
      const theSegment = segments.find(s => s.text.toLowerCase() === 'the');

      // Should exist and be colored with definite article grammar color
      expect(theSegment).toBeDefined();
      expect(theSegment?.color).toBe(MOCK_GRAMMAR_COLORS.definiteArticle);
    });
  });
});
