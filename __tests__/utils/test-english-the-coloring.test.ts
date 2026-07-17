/**
 * Test for English "the" coloring with coral color
 *
 * Bug: colorMapping in generateColorCodedSegments was missing 'coral' color
 * This caused ALL instances of "the" (from definite article ال) to not be colored
 *
 * Fix: Added coral (and other missing colors) to colorMapping
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

describe('English "the" coloring', () => {
  test('should color "the" with the definite-article color for الْبَيْت (the house of God)', () => {
    // Note: this test originally used الذي, but الذي is a fused relative pronoun
    // (FUSED_AL_WORDS) whose ال is deliberately not detected anymore.
    const analysis = analyzeArabicWord('البيت', 'the house of God');
    const formatted = formatWordAnalysis(analysis);

    const mockColors = {
      coral: '#e08b75', // Coral for definite article
      text: '#fcfffd', // Default text color
      grammar: MOCK_GRAMMAR_COLORS,
      // ... other colors would be here
    } as any;

    const segments = generateColorCodedSegments({
      text: 'the house of God',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Should have at least 2 segments: "the" and the rest
    expect(segments.length).toBeGreaterThanOrEqual(2);

    // Find the segment for "the"
    const theSegment = segments.find(s => s.text === 'the');
    expect(theSegment).toBeDefined();

    // Should be colored with definite article grammar color (not default text color!)
    expect(theSegment?.color).toBe(MOCK_GRAMMAR_COLORS.definiteArticle);
    expect(theSegment?.color).not.toBe('#fcfffd'); // NOT default text color
  });

  test('fused الذي must NOT paint "the"', () => {
    const analysis = analyzeArabicWord('الذي', 'the one who');
    expect(analysis.prefixes).toHaveLength(0);
    expect(analysis.hasComponents).toBe(false);
  });

  test('should color "the" for any word with ال prefix', () => {
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
