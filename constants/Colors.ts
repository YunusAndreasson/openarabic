import type { ThemeColors } from '../types/ui/theme.types';

// Base palette - your beautiful greenish warm foundation
const basePalette = {
  // Core sage-green family
  forest: {
    darkest: '#1A2B23', // Deep forest text
    dark: '#2B3C35', // Rich forest charcoal (primary)
    medium: '#4A5B52', // Balanced mid-tone sage
    light: '#748A7C', // Refined sage-blue
    lighter: '#9AB5A4', // Clear inactive state
  },

  // Warm sage backgrounds
  sage: {
    darkest: '#0E1512', // Rich dark forest background
    dark: '#1A211C', // Warm dark forest cards
    medium: '#2A352D', // Rich sage border
    light: '#E8F1EC', // Refined sage border
    lighter: '#F2F7F4', // Whisper-soft sage
    lightest: '#FAFCF9', // Crisp warm white
  },

  // Semantic warm tones
  semantic: {
    error: '#C74A3A', // Warm terracotta red
    errorDark: '#DD6B5A', // Warmer terracotta for dark mode
    success: '#4C7F5A', // Deep forest success
    successDark: '#72A47F', // Lighter forest for dark mode
    warning: '#B8860B', // Rich goldenrod
    warningDark: '#D4A876', // Enriched gold for dark
  },

  // Pure values
  pure: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
};

// Helper function for consistent opacity
const alpha = (color: string, opacity: number) =>
  `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;

export const Colors = {
  light: {
    // Core brand colors
    primary: basePalette.forest.dark,
    background: basePalette.sage.lightest,
    text: basePalette.forest.darkest,
    secondaryText: basePalette.forest.medium,
    textTertiary: basePalette.forest.light,
    border: basePalette.sage.light,
    card: basePalette.pure.white,
    cardBorder: basePalette.sage.lighter,

    // Semantic colors
    error: basePalette.semantic.error,
    success: basePalette.semantic.success,
    warning: basePalette.semantic.warning,
    info: basePalette.forest.light,

    // Text hierarchy - all using base palette
    englishText: basePalette.forest.medium,
    arabicText: basePalette.forest.darkest,
    authorText: basePalette.forest.light,
    headingText: basePalette.forest.darkest,
    subtitleText: '#35463E', // Slightly lighter than darkest
    metadataText: '#5C6F65', // Between medium and light
    captionText: '#6A7D74', // Between medium and light

    // Interactive elements
    tint: '#5B7F68', // Sophisticated sage tint
    tabIconDefault: basePalette.forest.lighter,
    tabIconSelected: '#5B7F68',
    icon: basePalette.forest.light,
    disabled: '#D2DBD6',

    // Overlays - using alpha helper for consistency
    transparent: basePalette.pure.transparent,
    overlay: alpha(basePalette.sage.lightest, 0.92),
    modalOverlay: alpha(basePalette.sage.lightest, 0.97),
    borderOverlay: alpha('#5B7F68', 0.06),
    buttonOverlay: alpha('#5B7F68', 0.08),
    buttonOverlayActive: alpha('#5B7F68', 0.12),
    buttonBorderOverlay: alpha(basePalette.pure.white, 0.2),
    backdropOverlay: alpha(basePalette.forest.dark, 0.68),
    contrastOverlay: alpha(basePalette.forest.dark, 0.32),

    // Elevation system
    shadow: basePalette.forest.dark,
    elevation1: basePalette.pure.white,
    elevation2: '#F9FCF8',
    elevation3: basePalette.sage.lighter,

    // Reading experience - consolidated similar values
    audioHighlight: '#F9FCF8',
    audioHighlightBorder: basePalette.sage.light,
    wordTooltipBg: basePalette.pure.white,
    wordTooltipText: basePalette.forest.darkest,
    wordTooltipBorder: basePalette.sage.light,
    wordTooltipShadow: alpha(basePalette.forest.dark, 0.12),
    wordSelectionUnderline: alpha('#5B7F68', 0.28),
    wordDueUnderline: alpha(basePalette.semantic.warning, 0.42),
    audioControlBg: basePalette.pure.white,
    audioControlBorder: basePalette.sage.light,
    audioControlShadow: alpha(basePalette.forest.dark, 0.08),

    // Navigation
    navigationRipple: alpha('#5B7F68', 0.1),
    headerOverlay: alpha(basePalette.sage.lightest, 0.96),
    tabBarOverlay: alpha(basePalette.sage.lightest, 0.92),

    // UI semantics
    progressIndicator: '#5B7F68',
    progressBackground: alpha('#5B7F68', 0.15),
    interactiveSecondary: basePalette.forest.light,
    completionSuccess: basePalette.semantic.success,
    repeatActive: basePalette.semantic.warning,
    socialIconBg: alpha('#5B7F68', 0.1),

    // Utility colors
    imagePlaceholder: basePalette.sage.lighter,
    textOverlay: alpha('#5B7F68', 0.04),
    textShadowDark: alpha(basePalette.forest.dark, 0.75),
    textShadowLight: alpha(basePalette.pure.white, 0.75),
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,

  dark: {
    // Core brand colors - using dark variants from base palette
    primary: '#F4F6F4',
    background: basePalette.sage.darkest,
    text: '#F4F6F4',
    secondaryText: '#D8DDD9',
    textTertiary: '#B6C2B8',
    border: basePalette.sage.medium,
    card: basePalette.sage.dark,
    cardBorder: basePalette.sage.medium,

    // Semantic colors - dark variants
    error: basePalette.semantic.errorDark,
    success: basePalette.semantic.successDark,
    warning: basePalette.semantic.warningDark,
    info: '#92A99A',

    // Text hierarchy - dark mode optimized
    englishText: '#D8DDD9',
    arabicText: '#F4F6F4',
    authorText: '#B6C2B8',
    headingText: '#F4F6F4',
    subtitleText: '#E6EAE7',
    metadataText: '#CAD3CC',
    captionText: '#BDC6BF',

    // Interactive elements
    tint: '#7FA08A',
    tabIconDefault: '#6E7F71',
    tabIconSelected: '#7FA08A',
    icon: '#B6C2B8',
    disabled: '#3C453E',

    // Overlays - dark mode variants
    transparent: basePalette.pure.transparent,
    overlay: alpha(basePalette.sage.darkest, 0.92),
    modalOverlay: alpha(basePalette.sage.darkest, 0.97),
    borderOverlay: alpha('#7FA08A', 0.08),
    buttonOverlay: alpha('#7FA08A', 0.1),
    buttonOverlayActive: alpha('#7FA08A', 0.15),
    buttonBorderOverlay: alpha('#F4F6F4', 0.15),
    backdropOverlay: alpha(basePalette.sage.darkest, 0.85),
    contrastOverlay: alpha(basePalette.pure.black, 0.52),

    // Elevation system
    shadow: basePalette.pure.black,
    elevation1: basePalette.sage.dark,
    elevation2: basePalette.sage.medium,
    elevation3: '#3A453D',

    // Reading experience - dark mode variants
    audioHighlight: basePalette.sage.medium,
    audioHighlightBorder: '#3A453D',
    wordTooltipBg: basePalette.sage.medium,
    wordTooltipText: '#F4F6F4',
    wordTooltipBorder: '#3A453D',
    wordTooltipShadow: alpha(basePalette.pure.black, 0.42),
    wordSelectionUnderline: alpha('#7FA08A', 0.32),
    wordDueUnderline: alpha(basePalette.semantic.warningDark, 0.52),
    audioControlBg: basePalette.sage.medium,
    audioControlBorder: '#3A453D',
    audioControlShadow: alpha(basePalette.pure.black, 0.32),

    // Navigation
    navigationRipple: alpha('#7FA08A', 0.12),
    headerOverlay: alpha(basePalette.sage.darkest, 0.96),
    tabBarOverlay: alpha(basePalette.sage.darkest, 0.92),

    // UI semantics
    progressIndicator: '#7FA08A',
    progressBackground: alpha('#7FA08A', 0.2),
    interactiveSecondary: '#B6C2B8',
    completionSuccess: basePalette.semantic.successDark,
    repeatActive: basePalette.semantic.warningDark,
    socialIconBg: alpha('#7FA08A', 0.1),

    // Utility colors
    imagePlaceholder: basePalette.sage.medium,
    textOverlay: alpha('#7FA08A', 0.06),
    textShadowDark: alpha(basePalette.pure.black, 0.75),
    textShadowLight: alpha('#F4F6F4', 0.75),
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
