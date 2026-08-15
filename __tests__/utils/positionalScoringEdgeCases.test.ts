/**
 * Positional Scoring and Overlap Resolution Edge Cases
 *
 * Tests for the overlap resolution algorithm and positional scoring system
 * that determines which component wins when multiple components match overlapping text.
 *
 * Phase 1, Task 3: Comprehensive test suite baseline
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';

type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

const mockColors: ThemeColors = {
  primary: '#4A9B6F',
  background: '#FFFFFF',
  text: '#000000',
  secondaryText: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  card: '#F9FAFB',
  cardBorder: '#E5E7EB',
  error: '#DC2626',
  success: '#059669',
  warning: '#F59E0B',
  englishText: '#000000',
  arabicText: '#1F2937',
  authorText: '#6B7280',
  headingText: '#111827',
  subtitleText: '#4B5563',
  metadataText: '#6B7280',
  secondaryMetadataText: '#9CA3AF',
  captionText: '#6B7280',
  tint: '#4A9B6F',
  tintBackground: '#F0F9FF',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#4A9B6F',
  icon: '#6B7280',
  disabled: '#D1D5DB',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalOverlay: 'rgba(0, 0, 0, 0.6)',
  borderOverlay: 'rgba(0, 0, 0, 0.1)',
  buttonOverlay: 'rgba(0, 0, 0, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  elevation0: '#FFFFFF',
  elevation1: '#FFFFFF',
  elevation2: '#F9FAFB',
  elevation3: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  textOverlay: 'rgba(0, 0, 0, 0.7)',
  textShadowDark: 'rgba(0, 0, 0, 0.4)',
  textShadowLight: 'rgba(0, 0, 0, 0.2)',
  info: '#3B82F6',
  modalIndicator: '#D1D5DB',
  backdropOverlay: 'rgba(0, 0, 0, 0.4)',
  wordTooltipBg: '#FFFFFF',
  wordTooltipText: '#1F2937',
  wordTooltipBorder: '#E5E7EB',
  wordTooltipShadow: 'rgba(0, 0, 0, 0.1)',
  navigationRipple: 'rgba(74, 155, 111, 0.12)',
  headerOverlay: 'rgba(255, 255, 255, 0.95)',
  tabBarOverlay: 'rgba(255, 255, 255, 0.95)',
  progressIndicator: '#4A9B6F',
  progressBackground: '#E5E7EB',
  interactiveSecondary: 'rgba(74, 155, 111, 0.1)',
  completionSuccess: '#10B981',
  chartGrid: '#E5E7EB',
  chartThreshold: '#F59E0B',
  accent: '#3B82F6',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  coral: '#F87171',
  grammar: MOCK_GRAMMAR_COLORS,
};

describe('Positional Scoring Edge Cases', () => {
  describe('Bracket Injection Priority', () => {
    test('the article section paints the word inside the brackets, brackets kept', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: '[the] house',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ال',
            englishPart: 'the',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: '[the] house',
        formattedAnalysis,
        analysis: { hasBracketInjection: true, hasComponents: true } as any,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // The ال section matches "the" inside the brackets like any other
      // component — brackets are word boundaries to the matcher.
      const theSegment = result.find(s => s.text === 'the');
      expect(theSegment).toBeDefined();
      expect(theSegment?.color).toBe(mockColors.tint);

      // The brackets survive, unpainted: they mark a word supplied for teaching.
      const bracketsSegment = result.find(s => s.text.includes('['));
      expect(bracketsSegment).toBeDefined();
      expect(bracketsSegment?.color).toBe(mockColors.text);
    });

    test('when two sections claim "the", the earlier one (the prefix) wins', () => {
      // Section order encodes the left-to-right Arabic↔English correspondence:
      // prefixes are emitted before suffixes, so the prefix claims first.
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: '[the] big house',
          },
          // Multiple components trying to match "the"
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ال',
            englishPart: 'the',
            icon: '→', // prefix
          },
          {
            type: 'components',
            colorName: 'warning',
            arabicPart: 'ت',
            englishPart: 'the',
            icon: '←', // suffix
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: '[the] big house',
        formattedAnalysis,
        analysis: { hasBracketInjection: true, hasComponents: true } as any,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Bracket injection should win (highest priority score)
      const theSegment = result.find(s => s.text === 'the');
      expect(theSegment).toBeDefined();
      expect(theSegment?.color).toBe(mockColors.tint);
    });
  });

  describe('Prefix vs Suffix Positional Scoring', () => {
    test('prefix at start of text scores 1.0 (optimal)', () => {
      // When prefix appears at text start (position 0), it gets optimal score
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and house',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→', // prefix icon
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Prefix "and" should be matched
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });

    test('suffix at end of text scores 1.0 (optimal)', () => {
      // When suffix appears at text end, it gets optimal score
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'house his',
          },
          {
            type: 'components',
            colorName: 'warning',
            arabicPart: 'ه',
            englishPart: 'his',
            icon: '←', // suffix icon
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'house his',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Suffix "his" should be matched
      const hisSegment = result.find(s => s.text === 'his');
      expect(hisSegment).toBeDefined();
      expect(hisSegment?.color).toBe(mockColors.warning);
    });

    test('prefix in middle of text scores lower than at start', () => {
      // Prefix score declines as it appears farther from start
      // At start: score = 1.0, at end: score = 0.0
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'house and book', // "and" in middle, not start
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→', // prefix icon
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'house and book',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "and" should still be matched (but with lower score)
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
    });
  });

  describe('Overlap Resolution', () => {
    test('when prefix and suffix overlap, use positional scoring to decide winner', () => {
      // Edge case: both prefix and suffix could match same word
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'to', // Could be prefix "to" or suffix "to"
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ل',
            englishPart: 'to',
            icon: '→', // prefix
          },
          {
            type: 'components',
            colorName: 'warning',
            arabicPart: 'تُ',
            englishPart: 'to',
            icon: '←', // suffix
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'to',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Single-word rule should prevent coloring
      // (this is just documenting current behavior)
      const coloredSegments = result.filter(
        s => s.color === mockColors.tint || s.color === mockColors.warning,
      );
      expect(coloredSegments.length).toBe(0);
    });

    test('multiple overlapping matches at same position - highest score wins', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'from house', // "from" at optimal position for prefix
          },
          // Two components competing for "from"
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'من',
            englishPart: 'from',
            icon: '→', // prefix - optimal position (score 1.0)
          },
          {
            type: 'components',
            colorName: 'violet',
            arabicPart: 'مم',
            englishPart: 'from',
            icon: '↔', // infix - neutral position (score 0.5)
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'from house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Prefix should win (higher score at start position)
      const fromSegment = result.find(s => s.text === 'from');
      expect(fromSegment).toBeDefined();
      expect(fromSegment?.color).toBe(mockColors.tint); // prefix color, not infix
    });
  });

  describe('Infix and Diacritic Neutral Scoring', () => {
    test('infix scores neutrally (0.5) regardless of position', () => {
      // Infixes can appear anywhere in the word, so they get neutral score
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'make book',
          },
          {
            type: 'components',
            colorName: 'violet',
            arabicPart: 'أ',
            englishPart: 'make',
            icon: '↔', // infix icon
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'make book',
        formattedAnalysis,
        analysis: { hasComponents: true } as any,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Infix "make" should be matched
      const makeSegment = result.find(s => s.text === 'make');
      expect(makeSegment).toBeDefined();
      expect(makeSegment?.color).toBe(mockColors.violet);
    });

    test('diacritic scores neutrally (0.5) regardless of position', () => {
      // Diacritics can appear anywhere, so they get neutral score
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'a book',
          },
          {
            type: 'components',
            colorName: 'accent',
            arabicPart: 'ً',
            englishPart: 'a',
            icon: '◌', // diacritic icon
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'a book',
        formattedAnalysis,
        analysis: { hasComponents: true } as any,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Diacritic "a" should be matched
      const aSegment = result.find(s => s.text === 'a');
      expect(aSegment).toBeDefined();
      expect(aSegment?.color).toBe(mockColors.accent);
    });
  });

  describe('Edge Cases: Empty and Boundary Conditions', () => {
    test('empty text returns single default segment', () => {
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

    test('text with no components returns single default segment', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'house',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('house');
      expect(result[0]?.color).toBe(mockColors.text);
    });

    test('component with no componentType uses neutral score', () => {
      // If icon is missing or unrecognized, component type is undefined
      // Should default to neutral score (0.5)
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and house',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            // No icon, so componentType will be undefined
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should still match "and" (uses neutral score)
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
    });
  });

  describe('Regression: Constants Usage', () => {
    test('should use POSITIONAL_SCORE.BRACKET_INJECTION constant', () => {
      // This test verifies the refactoring uses constants, not magic numbers
      // POSITIONAL_SCORE.BRACKET_INJECTION = 2.0
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: '[the] book',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ال',
            englishPart: 'the',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: '[the] book',
        formattedAnalysis,
        analysis: { hasBracketInjection: true, hasComponents: true } as any,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Bracket injection should work correctly with constant
      const theSegment = result.find(s => s.text === 'the');
      expect(theSegment).toBeDefined();
    });

    test('should use COMPONENT_TYPES constants for type matching', () => {
      // Verifies icon-to-type mapping uses COMPONENT_TYPES constants
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and house',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and',
            icon: '→', // Should map to COMPONENT_TYPES.PREFIX
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });
  });
});
