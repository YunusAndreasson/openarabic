import type { ThemeColors } from '@/types/ui/theme.types';

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

  // Interactive sage tints
  tint: {
    primary: '#5B7F68', // Sophisticated sage tint - light mode
    primaryDark: '#7FA08A', // Balanced sage tint - dark mode
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

// Calculated intermediate colors for perfect hierarchy
const textHierarchy = {
  light: {
    subtitle: '#35463E', // 25% blend between darkest and medium
    metadata: '#5C6F65', // 50% blend between medium and light
    caption: '#6A7D74', // 75% blend between medium and light
  },
  dark: {
    subtitle: '#E6EAE7', // Light mode equivalent
    metadata: '#CAD3CC', // Light mode equivalent
    caption: '#BDC6BF', // Light mode equivalent
  },
};

// Standardized opacity system
const opacity = {
  subtle: 0.04, // Very subtle overlays
  light: 0.06, // Light overlays
  medium: 0.08, // Standard hover states
  strong: 0.1, // Active backgrounds
  active: 0.12, // Strong active states
  border: 0.15, // Border overlays
  progress: 0.15, // Progress backgrounds
  disabled: 0.2, // Disabled backgrounds
  selection: 0.28, // Text selection
  tooltip: 0.32, // Tooltips and shadows
  due: 0.42, // Due word indicators
  overlay: 0.52, // Strong overlays
  backdrop: 0.68, // Modal backdrops
  shadow: 0.75, // Text shadows
  darkBackdrop: 0.85, // Dark mode backdrops
  modal: 0.92, // Modal overlays
  header: 0.96, // Header overlays
  full: 0.97, // Full modal overlays
};

// Elevation system
const elevation = {
  light: {
    level0: basePalette.sage.lightest, // Background
    level1: basePalette.pure.white, // Cards
    level2: '#F9FCF8', // Raised elements
    level3: basePalette.sage.lighter, // Floating elements
  },
  dark: {
    level0: basePalette.sage.darkest, // Background
    level1: basePalette.sage.dark, // Cards
    level2: basePalette.sage.medium, // Raised elements
    level3: '#3A453D', // Floating elements
  },
};

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

    // Text hierarchy - systematically calculated
    englishText: basePalette.forest.medium,
    arabicText: basePalette.forest.darkest,
    authorText: basePalette.forest.light,
    headingText: basePalette.forest.darkest,
    subtitleText: textHierarchy.light.subtitle,
    metadataText: textHierarchy.light.metadata,
    captionText: textHierarchy.light.caption,

    // Interactive elements
    tint: basePalette.tint.primary,
    tabIconDefault: basePalette.forest.lighter,
    tabIconSelected: basePalette.tint.primary,
    icon: basePalette.forest.light,
    disabled: '#D2DBD6',

    // Overlays - using standardized opacity system
    transparent: basePalette.pure.transparent,
    overlay: alpha(basePalette.sage.lightest, opacity.modal),
    modalOverlay: alpha(basePalette.sage.lightest, opacity.full),
    borderOverlay: alpha(basePalette.tint.primary, opacity.light),
    buttonOverlay: alpha(basePalette.tint.primary, opacity.medium),
    backdropOverlay: alpha(basePalette.forest.dark, opacity.backdrop),

    // Elevation system
    shadow: basePalette.forest.dark,
    elevation1: elevation.light.level1,
    elevation2: elevation.light.level2,
    elevation3: elevation.light.level3,

    // Reading experience - using standardized values
    audioHighlight: elevation.light.level2,
    audioHighlightBorder: basePalette.sage.light,
    wordTooltipBg: basePalette.pure.white,
    wordTooltipText: basePalette.forest.darkest,
    wordTooltipBorder: basePalette.sage.light,
    wordTooltipShadow: alpha(basePalette.forest.dark, opacity.active),
    wordSelectionUnderline: alpha(basePalette.tint.primary, opacity.selection),
    wordDueUnderline: alpha(basePalette.semantic.warning, opacity.due),

    // Navigation
    navigationRipple: alpha(basePalette.tint.primary, opacity.strong),
    headerOverlay: alpha(basePalette.sage.lightest, opacity.header),
    tabBarOverlay: alpha(basePalette.sage.lightest, opacity.modal),

    // UI semantics
    progressIndicator: basePalette.tint.primary,
    progressBackground: alpha(basePalette.tint.primary, opacity.progress),
    interactiveSecondary: basePalette.forest.light,
    completionSuccess: basePalette.semantic.success,

    // Utility colors
    imagePlaceholder: basePalette.sage.lighter,
    textOverlay: alpha(basePalette.tint.primary, opacity.subtle),
    textShadowDark: alpha(basePalette.forest.dark, opacity.shadow),
    textShadowLight: alpha(basePalette.pure.white, opacity.shadow),
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,

  dark: {
    // Core brand colors
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
    subtitleText: textHierarchy.dark.subtitle,
    metadataText: textHierarchy.dark.metadata,
    captionText: textHierarchy.dark.caption,

    // Interactive elements
    tint: basePalette.tint.primaryDark,
    tabIconDefault: '#6E7F71',
    tabIconSelected: basePalette.tint.primaryDark,
    icon: '#B6C2B8',
    disabled: '#3C453E',

    // Overlays - dark mode with standardized opacity
    transparent: basePalette.pure.transparent,
    overlay: alpha(basePalette.sage.darkest, opacity.modal),
    modalOverlay: alpha(basePalette.sage.darkest, opacity.full),
    borderOverlay: alpha(basePalette.tint.primaryDark, opacity.medium),
    buttonOverlay: alpha(basePalette.tint.primaryDark, opacity.strong),
    backdropOverlay: alpha(basePalette.sage.darkest, opacity.darkBackdrop),

    // Elevation system
    shadow: basePalette.pure.black,
    elevation1: elevation.dark.level1,
    elevation2: elevation.dark.level2,
    elevation3: elevation.dark.level3,

    // Reading experience - dark mode with standardized values
    audioHighlight: basePalette.sage.medium,
    audioHighlightBorder: elevation.dark.level3,
    wordTooltipBg: basePalette.sage.medium,
    wordTooltipText: '#F4F6F4',
    wordTooltipBorder: elevation.dark.level3,
    wordTooltipShadow: alpha(basePalette.pure.black, opacity.due),
    wordSelectionUnderline: alpha(basePalette.tint.primaryDark, opacity.tooltip),
    wordDueUnderline: alpha(basePalette.semantic.warningDark, opacity.overlay),

    // Navigation
    navigationRipple: alpha(basePalette.tint.primaryDark, opacity.active),
    headerOverlay: alpha(basePalette.sage.darkest, opacity.header),
    tabBarOverlay: alpha(basePalette.sage.darkest, opacity.modal),

    // UI semantics
    progressIndicator: basePalette.tint.primaryDark,
    progressBackground: alpha(basePalette.tint.primaryDark, opacity.disabled),
    interactiveSecondary: '#B6C2B8',
    completionSuccess: basePalette.semantic.successDark,

    // Utility colors
    imagePlaceholder: basePalette.sage.medium,
    textOverlay: alpha(basePalette.tint.primaryDark, opacity.light),
    textShadowDark: alpha(basePalette.pure.black, opacity.shadow),
    textShadowLight: alpha('#F4F6F4', opacity.shadow),
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
