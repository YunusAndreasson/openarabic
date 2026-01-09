/**
 * Tests for recently added grammar patterns
 * Verifies new features added during the color-coding enhancement session
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import type { ThemeColors } from '@/types/ui/theme.types';

const mockColors: ThemeColors = {
  primary: '#4A9B6F',
  secondary: '#2B3C35',
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
  accent: '#3B82F6',
  violet: '#9333EA',
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

describe('Recent Grammar Pattern Additions', () => {
  describe('Conjunction ف (fa) Usage', () => {
    test('should detect "for" in reason/purpose expressions', () => {
      const analysis = analyzeArabicWord('ف', 'for this');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "for" as one of the ف alternatives
      const forMatch = analysis.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('for'),
      );
      expect(forMatch).toBeTruthy();
    });

    test('should color-code "for" when it\'s a ف prefix', () => {
      const analysis = analyzeArabicWord('فهذا', 'for this');
      const formatted = formatWordAnalysis(analysis);

      const result = generateColorCodedSegments({
        text: 'for this',
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "for" should be colored with conjunction color (ف = conjunction role)
      const forSegment = result.find(s => s.text.toLowerCase() === 'for');
      expect(forSegment).toBeDefined();
      expect(forSegment?.color).toBe(mockColors.grammar.conjunction);
    });
  });

  describe('Oath Usage: "by" for و (wa)', () => {
    test('should detect "by" in oath expression "by Allah"', () => {
      const analysis = analyzeArabicWord('والله', 'by Allah');
      const formatted = formatWordAnalysis(analysis);

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "by" as one of the و alternatives
      const byMatch = analysis.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('by'),
      );
      expect(byMatch).toBeTruthy();
    });

    test('should color-code "by" in "by Allah"', () => {
      const analysis = analyzeArabicWord('والله', 'by Allah');
      const formatted = formatWordAnalysis(analysis);

      const result = generateColorCodedSegments({
        text: 'by Allah',
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "by" should be colored with conjunction color (و = conjunction role)
      const bySegment = result.find(s => s.text.toLowerCase() === 'by');
      expect(bySegment).toBeDefined();
      expect(bySegment?.color).toBe(mockColors.grammar.conjunction);
    });

    test('should NOT match "by" in "nearby" (word boundary)', () => {
      const formattedAnalysis = {
        sections: [
          {
            type: 'original' as const,
            content: 'nearby',
          },
          {
            type: 'components' as const,
            colorName: 'tint' as const,
            arabicPart: 'و',
            englishPart: 'by',
            icon: '→',
          },
        ],
        reconstructedArabic: undefined,
      };

      const result = generateColorCodedSegments({
        text: 'nearby',
        formattedAnalysis,
        analysis: null,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // Should NOT color any part of "nearby"
      const coloredSegments = result.filter(s => s.color === mockColors.tint);
      expect(coloredSegments.length).toBe(0);
    });
  });

  describe('Preposition ب (bi) New Alternatives', () => {
    test('should detect "based" in "based on"', () => {
      const analysis = analyzeArabicWord('بمقتضى', 'based on');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "based" as one of the ب alternatives
      const basedMatch = analysis.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('based'),
      );
      expect(basedMatch).toBeTruthy();
    });
  });

  describe('Exception Particle إلا (illa)', () => {
    test('should detect "none" in "none but"', () => {
      const analysis = analyzeArabicWord('إلا', 'none but');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "none" as one of the إلا alternatives
      const noneMatch = analysis.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('none'),
      );
      expect(noneMatch).toBeTruthy();
    });
  });

  describe('Negation Particles', () => {
    test('should detect "does not" for لم', () => {
      const analysis = analyzeArabicWord('لم', 'does not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "does not" as one of the لم alternatives
      const doesNotMatch = analysis.prefixes[0]?.englishMatches.some(
        m => m.toLowerCase() === 'does not' || m.toLowerCase() === "doesn't",
      );
      expect(doesNotMatch).toBeTruthy();
    });

    test('should detect multi-prefix ولا (and not)', () => {
      const analysis = analyzeArabicWord('ولا', 'and not');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Multi-prefix: و (and) + لا (not)
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Interrogative كم (kam)', () => {
    test('should detect "how much" for كم', () => {
      const analysis = analyzeArabicWord('كم', 'how much');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "how much" as one of the كم alternatives
      const howMuchMatch = analysis.prefixes[0]?.englishMatches.some(
        m => m.toLowerCase().includes('how') && m.toLowerCase().includes('much'),
      );
      expect(howMuchMatch).toBeTruthy();
    });

    test('should detect "how many" for كم', () => {
      const analysis = analyzeArabicWord('كم', 'how many');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match "how many" as one of the كم alternatives
      const howManyMatch = analysis.prefixes[0]?.englishMatches.some(
        m => m.toLowerCase().includes('how') && m.toLowerCase().includes('many'),
      );
      expect(howManyMatch).toBeTruthy();
    });
  });
});
