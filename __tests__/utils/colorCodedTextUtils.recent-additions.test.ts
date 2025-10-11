/**
 * Tests for recently added grammar patterns
 * Verifies new features added during the color-coding enhancement session
 */

import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import type { ThemeColors } from '@/types/ui/theme.types';

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
};

describe('Recent Grammar Pattern Additions', () => {
  describe('Conjunction ف (fa) Usage', () => {
    it('should detect "for" in reason/purpose expressions', () => {
      const analysis = analyzeArabicWord('ف', 'for this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "for" as one of the ف alternatives
      const forMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('for')
      );
      expect(forMatch).toBe(true);
    });

    it('should color-code "for" when it\'s a ف prefix', () => {
      const analysis = analyzeArabicWord('فهذا', 'for this');
      const formatted = formatWordAnalysis(analysis);

      const result = generateColorCodedSegments({
        text: 'for this',
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "for" should be colored with prefix color
      const forSegment = result.find(s => s.text.toLowerCase() === 'for');
      expect(forSegment).toBeDefined();
      expect(forSegment?.color).toBe(mockColors.tint);
    });
  });

  describe('Oath Usage: "by" for و (wa)', () => {
    it('should detect "by" in oath expression "by Allah"', () => {
      const analysis = analyzeArabicWord('والله', 'by Allah');
      const formatted = formatWordAnalysis(analysis);

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "by" as one of the و alternatives
      const byMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('by')
      );
      expect(byMatch).toBe(true);
    });

    it('should color-code "by" in "by Allah"', () => {
      const analysis = analyzeArabicWord('والله', 'by Allah');
      const formatted = formatWordAnalysis(analysis);

      const result = generateColorCodedSegments({
        text: 'by Allah',
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // "by" should be colored with prefix color
      const bySegment = result.find(s => s.text.toLowerCase() === 'by');
      expect(bySegment).toBeDefined();
      expect(bySegment?.color).toBe(mockColors.tint);
    });

    it('should NOT match "by" in "nearby" (word boundary)', () => {
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
    it('should detect "concerning" in "concerning what"', () => {
      const analysis = analyzeArabicWord('بما', 'concerning what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "concerning" as one of the ب alternatives
      const concerningMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('concerning')
      );
      expect(concerningMatch).toBe(true);
    });

    it('should detect "based" in "based on"', () => {
      const analysis = analyzeArabicWord('بمقتضى', 'based on');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "based" as one of the ب alternatives
      const basedMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('based')
      );
      expect(basedMatch).toBe(true);
    });
  });

  describe('Exception Particle إلا (illa)', () => {
    it('should detect "none" in "none but"', () => {
      const analysis = analyzeArabicWord('إلا', 'none but');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "none" as one of the إلا alternatives
      const noneMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('none')
      );
      expect(noneMatch).toBe(true);
    });
  });

  describe('Negation Particles', () => {
    it('should detect "does not" for لم', () => {
      const analysis = analyzeArabicWord('لم', 'does not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "does not" as one of the لم alternatives
      const doesNotMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase() === 'does not' || m.toLowerCase() === "doesn't"
      );
      expect(doesNotMatch).toBe(true);
    });

    it('should detect negation in compound ولا (and not)', () => {
      const analysis = analyzeArabicWord('ولا', 'and not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match compound و+لا for "and not"
      const notMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('and') && m.toLowerCase().includes('not')
      );
      expect(notMatch).toBe(true);
    });
  });

  describe('Interrogative كم (kam)', () => {
    it('should detect "how much" for كم', () => {
      const analysis = analyzeArabicWord('كم', 'how much');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "how much" as one of the كم alternatives
      const howMuchMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('how') && m.toLowerCase().includes('much')
      );
      expect(howMuchMatch).toBe(true);
    });

    it('should detect "how many" for كم', () => {
      const analysis = analyzeArabicWord('كم', 'how many');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match "how many" as one of the كم alternatives
      const howManyMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('how') && m.toLowerCase().includes('many')
      );
      expect(howManyMatch).toBe(true);
    });
  });
});
