import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
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
};

describe('Multi-Prefix English Coloring', () => {
  it('should color multi-prefix components with different colors (وعن → "and from")', () => {
    const analysis = analyzeArabicWord('وعن', 'and from');
    const formatted = formatWordAnalysis(analysis);

    const result = generateColorCodedSegments({
      text: 'and from',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('\n=== وعن (and from) ===');
    console.log('Analysis prefix:', analysis.prefixes[0]?.arabicMatch);
    console.log('English matches:', analysis.prefixes[0]?.englishMatches);
    console.log('Formatted sections:', JSON.stringify(formatted.sections, null, 2));
    console.log('Color-coded segments:', JSON.stringify(result, null, 2));

    // Should color the phrase with multi-prefix detection
    expect(result.length).toBeGreaterThan(0);

    // Multi-prefix: و (and) = secondary, عن (from) = warning
    const conjunctionSegments = result.filter(s => s.color === mockColors.secondary);
    const prepositionSegments = result.filter(s => s.color === mockColors.warning);

    // Should have "and" in secondary color (conjunction)
    const conjunctionText = conjunctionSegments.map(s => s.text).join(' ').toLowerCase();
    expect(conjunctionText).toContain('and');

    // Should have "from" in warning color (preposition)
    const prepositionText = prepositionSegments.map(s => s.text).join(' ').toLowerCase();
    expect(prepositionText).toContain('from');
  });

  it('should color multi-prefix with suffix (وعنه → "and from him")', () => {
    const analysis = analyzeArabicWord('وعنه', 'and from him');
    const formatted = formatWordAnalysis(analysis);

    const result = generateColorCodedSegments({
      text: 'and from him',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('\n=== وعنه (and from him) ===');
    console.log('Analysis prefix:', analysis.prefixes[0]?.arabicMatch);
    console.log('Analysis suffix:', analysis.suffix?.arabicMatch);
    console.log('Formatted sections:', JSON.stringify(formatted.sections, null, 2));
    console.log('Color-coded segments:', JSON.stringify(result, null, 2));

    // Should have at least 3 colors: secondary (و), warning (عن), violet (ه)
    const colors = new Set(result.map(s => s.color));
    expect(colors.size).toBeGreaterThan(1);

    // Multi-prefix: و (and) = secondary
    const conjunctionSegments = result.filter(s => s.color === mockColors.secondary);
    const conjunctionText = conjunctionSegments.map(s => s.text).join(' ').toLowerCase();
    expect(conjunctionText).toContain('and');

    // Multi-prefix: عن (from) = warning
    const prepositionSegments = result.filter(s => s.color === mockColors.warning);
    const prepositionText = prepositionSegments.map(s => s.text).join(' ').toLowerCase();
    expect(prepositionText).toContain('from');

    // Suffix: ه (him) = violet (possessive)
    const suffixSegments = result.filter(s => s.color === mockColors.violet);
    const suffixText = suffixSegments.map(s => s.text).join('').toLowerCase();
    expect(suffixText).toContain('him');
  });
});
