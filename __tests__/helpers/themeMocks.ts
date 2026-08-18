/**
 * A complete `ThemeColors` for tests.
 *
 * Four util suites each carried a byte-identical ~50-line `mockColors` literal
 * annotated `: ThemeColors` that did not satisfy it — they declared a `primary`
 * key the theme has never had and omitted roughly half the real ones. Because
 * `__tests__` was never type-checked, nothing said so.
 *
 * Values are placeholders: these suites assert on which colour a segment gets,
 * not on the hex itself, so what matters is that every key exists.
 */
import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import type { ThemeColors } from '@/types/ui/theme.types';

export const createThemeColorsMock = (overrides: Partial<ThemeColors> = {}): ThemeColors => ({
  secondary: '#4A9B6F',
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
  cardOverlayHeading: '#FFFFFF',
  cardOverlayAuthor: '#E5E7EB',
  subtitleText: '#4B5563',
  metadataText: '#6B7280',
  secondaryMetadataText: '#9CA3AF',
  captionText: '#6B7280',
  subtleLabelText: '#9CA3AF',

  tint: '#4A9B6F',
  tintBackground: '#E8F5EF',
  onTint: '#FFFFFF',
  onError: '#FFFFFF',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#4A9B6F',
  tabLabelSelected: '#4A9B6F',
  icon: '#6B7280',
  disabled: '#D1D5DB',
  disabledButtonBg: '#F3F4F6',
  transparent: 'transparent',
  borderOverlay: 'rgba(0,0,0,0.08)',
  shadow: '#000000',
  elevation0: '#FFFFFF',
  elevation1: '#FAFAFA',
  elevation2: '#F5F5F5',
  elevation3: '#EFEFEF',
  white: '#FFFFFF',
  info: '#2563EB',
  accent: '#7C3AED',
  violet: '#8B5CF6',

  modalIndicator: '#D1D5DB',

  backdropOverlay: 'rgba(0,0,0,0.4)',
  toastBorder: '#E5E7EB',
  gradientOverlay: 'rgba(0,0,0,0.35)',
  wordTooltipBorder: '#E5E7EB',

  navigationRipple: 'rgba(0,0,0,0.12)',

  progressIndicator: '#4A9B6F',
  progressBackground: '#E5E7EB',
  readingProgressIndicator: '#4A9B6F',
  readingProgressBackground: '#E5E7EB',
  completionSuccess: '#059669',

  chartGrid: '#E5E7EB',
  chartThreshold: '#9CA3AF',
  chartAccent: '#4A9B6F',

  cardGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'] as const,

  grammar: MOCK_GRAMMAR_COLORS,

  ...overrides,
});
