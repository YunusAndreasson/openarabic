import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
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

describe('Compound Prefix English Coloring', () => {
  it('should color entire compound prefix in English (وعن → "and from")', () => {
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
    console.log('Analysis prefix:', analysis.prefix?.arabicMatch);
    console.log('English matches:', analysis.prefix?.englishMatches);
    console.log('Formatted sections:', JSON.stringify(formatted.sections, null, 2));
    console.log('Color-coded segments:', JSON.stringify(result, null, 2));

    // Should color the entire phrase "and from"
    expect(result.length).toBeGreaterThan(0);

    // Find the colored segment(s)
    const coloredSegments = result.filter(s => s.color === mockColors.tint);
    expect(coloredSegments.length).toBeGreaterThan(0);

    // The colored text should include both "and" and "from"
    const coloredText = coloredSegments.map(s => s.text).join(' ');
    expect(coloredText).toContain('and');
    expect(coloredText).toContain('from');
  });

  it('should color compound prefix with suffix (وعنه → "and from him")', () => {
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
    console.log('Analysis prefix:', analysis.prefix?.arabicMatch);
    console.log('Analysis suffix:', analysis.suffix?.arabicMatch);
    console.log('Formatted sections:', JSON.stringify(formatted.sections, null, 2));
    console.log('Color-coded segments:', JSON.stringify(result, null, 2));

    // Should have at least 2 colors: tint (prefix) and warning (suffix)
    const colors = new Set(result.map(s => s.color));
    expect(colors.size).toBeGreaterThan(1);

    // Should color "and from" with prefix color (tint)
    const prefixSegments = result.filter(s => s.color === mockColors.tint);
    const prefixText = prefixSegments.map(s => s.text).join(' ').toLowerCase();
    expect(prefixText).toContain('and');
    expect(prefixText).toContain('from');

    // Should color "him" with suffix color (warning)
    const suffixSegments = result.filter(s => s.color === mockColors.warning);
    const suffixText = suffixSegments.map(s => s.text).join('').toLowerCase();
    expect(suffixText).toContain('him');
  });
});
