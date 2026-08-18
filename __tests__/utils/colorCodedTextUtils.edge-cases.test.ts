/**
 * Edge Case Tests for Color-Coding System
 * Tests for potential bugs, boundary conditions, and robustness
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { shouldApplyColorCoding } from '@/utils/colorResolution';
import type { formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { createThemeColorsMock } from '@/__tests__/helpers/themeMocks';

type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

const mockColors = createThemeColorsMock();

describe('Color-Coding Edge Cases', () => {
  describe('Punctuation Handling', () => {
    test('should match "by" in "by Allah!" (with exclamation)', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'by Allah!',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'by',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'by Allah!',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "by" should be matched despite the exclamation mark
      const bySegment = result.find(s => s.text === 'by');
      expect(bySegment).toBeDefined();
      expect(bySegment?.color).toBe(mockColors.tint);
    });

    test('should match "and from" in "(and from)"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: '(and from)',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'وعن',
            englishPart: 'and from',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: '(and from)',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should match despite parentheses
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBeGreaterThan(0);
    });

    test('should match components with quotes: by "Allah"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'by "Allah"',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'by',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'by "Allah"',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "by" should be matched despite the quotes around Allah
      const bySegment = result.find(s => s.text === 'by');
      expect(bySegment).toBeDefined();
      expect(bySegment?.color).toBe(mockColors.tint);
    });
  });

  describe('Whitespace Handling', () => {
    test('should handle multiple spaces: "and    from" (4 spaces)', () => {
      // Verify that multiple spaces are treated as multi-word
      expect(shouldApplyColorCoding('and    from')).toBeTruthy();

      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'and    from',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'عن',
            englishPart: 'from',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and    from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should match individual words despite multiple spaces
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });

    test('should handle tabs: "and\\t\\tfrom"', () => {
      expect(shouldApplyColorCoding('and\t\tfrom')).toBeTruthy();
    });

    test('should handle newlines: "and\\n\\nfrom"', () => {
      expect(shouldApplyColorCoding('and\n\nfrom')).toBeTruthy();
    });

    test('should handle leading/trailing spaces: "  and from  "', () => {
      expect(shouldApplyColorCoding('  and from  ')).toBeTruthy();
    });
  });

  describe('Empty and Null Handling', () => {
    test('should handle empty string input', () => {
      const result = generateColorCodedSegments({
        text: '',
        formattedAnalysis: null,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('');
      expect(result[0]?.color).toBe(mockColors.text);
    });

    test('should handle null formattedAnalysis', () => {
      const result = generateColorCodedSegments({
        text: 'and from',
        formattedAnalysis: null,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('and from');
      expect(result[0]?.color).toBe(mockColors.text);
      expect(result[0]?.key).toBe('no-analysis');
    });

    test('should handle component with empty englishPart', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'and from',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: '', // Empty!
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should not crash, should return default color
      expect(result).toHaveLength(1);
      expect(result[0]?.color).toBe(mockColors.text);
    });
  });

  describe('Overlapping Matches', () => {
    test('should color both occurrences in "from from"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'from from',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'من',
            englishPart: 'from',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'from from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Both "from" should be colored
      const fromSegments = result.filter(s => s.text === 'from');
      expect(fromSegments.length).toBe(2);
      fromSegments.forEach(segment => {
        expect(segment.color).toBe(mockColors.tint);
      });
    });
  });

  describe('Capitalization', () => {
    test('should match "And" (capitalized) to "and" component', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'And from',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'And from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "And" should be matched (case-insensitive)
      const andSegment = result.find(s => s.text === 'And');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });

    test('should preserve case: render "And" not "and"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'And from',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'And from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should preserve original capitalization
      const andSegment = result.find(s => s.text === 'And');
      expect(andSegment).toBeDefined();
      expect(andSegment?.text).toBe('And'); // Capital A preserved
    });
  });

  describe('Color Resolution', () => {
    /**
     * This replaced a test that fed `colorName: 'unknownColor' as any` in and
     * asserted a fallback to `colors.text`.
     *
     * That state is now unreachable: `formatWordAnalysis` types `colorName` as
     * `ValidColorName`, and both colour tables it draws from are pinned to that
     * union with `satisfies`, so an unknown name is a compile error at the
     * place it is written. A test that can only reach the branch through a cast
     * was asserting the cast, not the app — and the fallback it guarded made a
     * mistyped colour paint as body text instead of failing anywhere visible.
     *
     * What is worth checking is the invariant that replaced it: every section a
     * real analysis produces resolves to an actual colour.
     */
    test('every section of a real analysis resolves to a defined color', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          { type: 'original', content: 'and from' },
          {
            type: 'components',
            colorName: 'grammar.conjunction',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'من',
            englishPart: 'from',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and from',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result.length).toBeGreaterThan(0);
      for (const segment of result) {
        expect(segment.color).toBeDefined();
        expect(segment.color).not.toBe('');
      }
      expect(result.find(s => s.text === 'and')?.color).toBe(mockColors.grammar.conjunction);
      expect(result.find(s => s.text === 'from')?.color).toBe(mockColors.tint);
    });
  });

  describe('Contraction Handling', () => {
    test('should match "don\'t" when component says "do not"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: "don't go",
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'لا',
            englishPart: 'do not',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: "don't go",
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "don't" should be matched as contraction of "do not"
      const dontSegment = result.find(s => s.text === "don't");
      expect(dontSegment).toBeDefined();
      expect(dontSegment?.color).toBe(mockColors.tint);
    });

    test('should match "doesn\'t" when component says "does not"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: "doesn't work",
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'لم',
            englishPart: 'does not',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: "doesn't work",
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "doesn't" should be matched
      const doesntSegment = result.find(s => s.text === "doesn't");
      expect(doesntSegment).toBeDefined();
      expect(doesntSegment?.color).toBe(mockColors.tint);
    });
  });

  describe('Word Boundary Edge Cases', () => {
    test('should NOT match "and" in "sand"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'sand',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'sand',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should NOT match "and" within "sand"
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should NOT match "and" in "stand"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        title: '',
        sections: [
          {
            type: 'original',
            content: 'stand',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'stand',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should NOT match "and" within "stand"
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });
});
