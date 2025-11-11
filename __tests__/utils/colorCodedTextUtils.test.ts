/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { GRAMMAR_COLOR_MAP } from '@/__tests__/utils/grammarColorMap';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { formatWordAnalysis, WordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments, shouldApplyColorCoding } from '@/utils/colorCodedTextUtils';

// Type for formatted analysis result
type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

// Mock colors object
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
  grammar: MOCK_GRAMMAR_COLORS,
};

describe('colorCodedTextUtils', () => {
  describe('GRAMMAR_COLOR_MAP', () => {
    test('should have correct color mappings', () => {
      expect(GRAMMAR_COLOR_MAP).toEqual({
        tint: 'tint',
        primary: 'primary',
        warning: 'warning',
        secondaryText: 'secondaryText',
        accent: 'accent',
        violet: 'violet',
        text: 'text',
      });
    });
  });

  describe('shouldApplyColorCoding', () => {
    test('should return false for single words', () => {
      expect(shouldApplyColorCoding('house')).toBe(false);
      expect(shouldApplyColorCoding('book')).toBe(false);
      expect(shouldApplyColorCoding('school')).toBe(false);
    });

    test('should return true for multi-word phrases', () => {
      expect(shouldApplyColorCoding('and house')).toBe(true);
      expect(shouldApplyColorCoding('his book')).toBe(true);
      expect(shouldApplyColorCoding('in the house')).toBe(true);
      expect(shouldApplyColorCoding('the big house')).toBe(true);
    });

    test('should handle whitespace correctly', () => {
      expect(shouldApplyColorCoding('  house  ')).toBe(false);
      expect(shouldApplyColorCoding('  the house  ')).toBe(true);
      expect(shouldApplyColorCoding('house   book')).toBe(true);
    });
  });

  describe('generateColorCodedSegments', () => {
    test('should return single segment for single words', () => {
      const result = generateColorCodedSegments({
        text: 'house',
        formattedAnalysis: null,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('house');
      expect(result[0]?.color).toBe(mockColors.text);
      expect(result[0]?.key).toBe('no-analysis'); // No analysis available, not single-word
    });

    test('should return single segment when no analysis available', () => {
      const result = generateColorCodedSegments({
        text: 'the house',
        formattedAnalysis: null,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('the house');
      expect(result[0]?.color).toBe(mockColors.text);
      expect(result[0]?.key).toBe('no-analysis');
    });

    test('should return single segment when no components found', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'the house',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'the house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('the house');
      expect(result[0]?.color).toBe(mockColors.text);
      expect(result[0]?.key).toBe('no-components');
    });

    test('should color-code multi-word phrases with components', () => {
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
            icon: '→',
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

      // Should have 2 segments: "and" (colored) + " house" (default)
      expect(result.length).toBeGreaterThanOrEqual(2);
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });

    test('should handle bracket injection for definite articles', () => {
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

      const analysis: WordAnalysis = {
        hasComponents: true,
        hasBracketInjection: true,
      };

      const result = generateColorCodedSegments({
        text: '[the] book',
        formattedAnalysis,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Bracket injection adds [the] in analysis but displays as "the" without brackets
      // The result should have "the" (not "[the]") as a colored segment
      expect(result.length).toBeGreaterThan(0);

      // Find segment with "the" (brackets removed for display)
      const bracketSegment = result.find(s => s.text === 'the');
      expect(bracketSegment).toBeDefined();
      expect(bracketSegment?.color).toBe(mockColors.tint);
    });

    test('should NOT bypass color-coding when bracket injection makes single word multi-word', () => {
      // This tests the critical bug fix: bracket injection should enable color-coding
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: '[the] house', // 2 words after injection
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

      const analysis: WordAnalysis = {
        hasComponents: true,
        hasBracketInjection: true,
      };

      const result = generateColorCodedSegments({
        text: 'house', // Original text is single word WITHOUT brackets
        formattedAnalysis,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should NOT trigger single-word bypass because displayedText is "[the] house" (2 words)
      expect(result.length).toBeGreaterThan(1);

      // Should have colored "the" (brackets removed for display)
      const bracketSegment = result.find(s => s.text === 'the');
      expect(bracketSegment).toBeDefined();
      expect(bracketSegment?.color).toBe(mockColors.tint);
    });

    test('should handle multiple component matches', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and his book',
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
            colorName: 'warning',
            arabicPart: 'ه',
            englishPart: 'his',
            icon: '←',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'and his book',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should have "and" and "his" colored differently
      const andSegment = result.find(s => s.text === 'and');
      const hisSegment = result.find(s => s.text === 'his');

      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
      expect(hisSegment).toBeDefined();
      expect(hisSegment?.color).toBe(mockColors.warning);
    });

    test('should handle word boundaries correctly', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and stand',
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
        text: 'and stand',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "and" should be matched as whole word, not the "and" in "stand"
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);

      // Result should have multiple segments (not a single segment)
      expect(result.length).toBeGreaterThan(1);
    });

    test('should handle multiple occurrences of the same word', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and this and that',
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
        text: 'and this and that',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Both "and" occurrences should be colored
      const andSegments = result.filter(s => s.text === 'and');
      expect(andSegments.length).toBeGreaterThanOrEqual(2);
      andSegments.forEach(segment => {
        expect(segment.color).toBe(mockColors.tint);
      });
    });

    test('should handle slash-separated alternatives in englishPart', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'his book',
          },
          {
            type: 'components',
            colorName: 'warning',
            arabicPart: 'ه',
            englishPart: 'his / its / it',
            icon: '←',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'his book',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "his" should be matched from the alternatives
      const hisSegment = result.find(s => s.text === 'his');
      expect(hisSegment).toBeDefined();
      expect(hisSegment?.color).toBe(mockColors.warning);
    });
  });
});
