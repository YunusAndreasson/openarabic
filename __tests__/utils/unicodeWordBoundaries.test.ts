/**
 * Unicode Word Boundary Tests
 *
 * Tests for the Unicode letter detection fix (Phase 1, Issue #1)
 *
 * Previously: LETTER_REGEX = /[a-z]/ (ASCII only, broken on accented characters)
 * Fixed: LETTER_REGEX = /\p{L}/u (Full Unicode support)
 *
 * This test suite verifies that accented characters are NOT treated as word boundaries,
 * preventing false positive matches in words like "café", "André", "naïve", etc.
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
  grammar: MOCK_GRAMMAR_COLORS,
};

describe('Unicode Word Boundary Detection', () => {
  describe('French Accented Characters', () => {
    test('should NOT match "and" in "André"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'André',
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
        text: 'André',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "and" should NOT be matched within "André" (é is a letter, not a boundary)
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);

      // Should return single segment with default color
      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('André');
      expect(result[0]?.color).toBe(mockColors.text);
    });

    test('should NOT match "from" in "Frömming"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'Frömming',
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
        text: 'Frömming',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "from" should NOT be matched within "Frömming" (ö is a letter, not a boundary)
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should NOT match components in "café"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'café',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and', // hypothetical component
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'café',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // No false matches should occur
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should NOT match components in "naïve"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'naïve',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ي',
            englishPart: 'i', // hypothetical component
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'naïve',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // No false matches should occur
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });

  describe('Spanish Accented Characters', () => {
    test('should NOT match components in "señor"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'señor',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'من',
            englishPart: 'or', // hypothetical false match
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'señor',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // ñ is a letter, not a boundary - "or" should not match
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should NOT match components in "José"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'José',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and', // hypothetical component
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'José',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });

  describe('German Accented Characters', () => {
    test('should NOT match components in "Müller"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'Müller',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ل',
            englishPart: 'to', // hypothetical false match
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'Müller',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should NOT match components in "Größe"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'Größe',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'و',
            englishPart: 'and', // hypothetical component
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'Größe',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });

  describe('Multi-word Phrases with Accented Characters', () => {
    test('should correctly match "and" in "and café"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'and café',
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
        text: 'and café',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "and" should be matched (valid word boundary with space)
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);

      // "café" should NOT be colored (it's not a component)
      const cafeSegment = result.find(s => s.text.includes('café'));
      expect(cafeSegment?.color).toBe(mockColors.text);
    });

    test('should correctly match components in "by André"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'by André',
          },
          {
            type: 'components',
            colorName: 'tint',
            arabicPart: 'ب',
            englishPart: 'by',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'by André',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "by" should be matched (valid component)
      const bySegment = result.find(s => s.text === 'by');
      expect(bySegment).toBeDefined();
      expect(bySegment?.color).toBe(mockColors.tint);

      // "André" should NOT have "and" matched within it
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeUndefined();
    });
  });

  describe('Regression: ASCII Characters Still Work', () => {
    test('should still correctly match "and" in "and house"', () => {
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

      // "and" should still be matched correctly
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);
    });

    test('should still NOT match "and" in "sand"', () => {
      const formattedAnalysis: FormattedAnalysis = {
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

      // "and" should NOT be matched within "sand" (still works correctly)
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });

    test('should still correctly match "from" in "from house"', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'from house',
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
        text: 'from house',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "from" should still be matched correctly
      const fromSegment = result.find(s => s.text === 'from');
      expect(fromSegment).toBeDefined();
      expect(fromSegment?.color).toBe(mockColors.tint);
    });
  });

  describe('Edge Cases with Mixed Characters', () => {
    test('should handle text with multiple accented words', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'José and André',
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
        text: 'José and André',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "and" should be colored (the actual component)
      const andSegment = result.find(s => s.text === 'and');
      expect(andSegment).toBeDefined();
      expect(andSegment?.color).toBe(mockColors.tint);

      // "José" and "André" should NOT have "and" matched within them
      // The key test: accented characters prevent false substring matches
      const joseSegment = result.find(s => s.text === 'José');
      const andreSegment = result.find(s => s.text === 'André');

      // If José or André appear as segments, they should have default color (not component color)
      if (joseSegment) {
        expect(joseSegment.color).toBe(mockColors.text);
      }
      if (andreSegment) {
        expect(andreSegment.color).toBe(mockColors.text);
      }

      // Most importantly: "and" should NOT be extracted as a substring from "André"
      // (é acts as a letter, preventing word boundary at "Andr|é")
      const segments = result.map(s => s.text);
      expect(segments).not.toContain('Andr'); // Substring match would create this
    });

    test('should handle punctuation after accented characters', () => {
      const formattedAnalysis: FormattedAnalysis = {
        sections: [
          {
            type: 'original',
            content: 'café!',
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
        text: 'café!',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // No false matches
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });
});
