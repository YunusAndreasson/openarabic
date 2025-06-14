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

  // Green-tinted pure values (never pure white/black)
  pure: {
    white: '#FDFEFE', // Subtle green-tinted white
    black: '#0A0F0B', // Subtle green-tinted black
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
    level1: basePalette.pure.white, // Cards (green-tinted white)
    level2: basePalette.sage.lightest, // Raised elements - use palette reference
    level3: basePalette.sage.lighter, // Floating elements
  },
  dark: {
    level0: basePalette.sage.darkest, // Background
    level1: basePalette.sage.dark, // Cards
    level2: basePalette.sage.medium, // Raised elements
    level3: basePalette.sage.medium, // Floating elements - use consistent reference
  },
};

export const Colors = {
  light: {
    // Core brand colors - improved contrast
    primary: basePalette.forest.dark,
    background: basePalette.sage.lighter, // Changed from lightest for better contrast
    text: basePalette.forest.darkest,
    secondaryText: basePalette.forest.medium,
    textTertiary: basePalette.forest.light,
    border: basePalette.sage.light, // Use palette reference instead of hardcoded
    card: basePalette.pure.white,
    cardBorder: basePalette.sage.light, // Use palette reference for consistency

    // Semantic colors
    error: basePalette.semantic.error,
    success: basePalette.semantic.success,
    warning: basePalette.semantic.warning,
    info: basePalette.forest.light,

    // Text hierarchy - enhanced for better readability
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
    disabled: basePalette.forest.lighter,

    // Overlays - adjusted for new background
    transparent: basePalette.pure.transparent,
    overlay: alpha(basePalette.sage.lighter, opacity.modal),
    modalOverlay: alpha(basePalette.sage.lighter, opacity.full),
    borderOverlay: alpha(basePalette.tint.primary, opacity.light),
    buttonOverlay: alpha(basePalette.tint.primary, opacity.medium),
    backdropOverlay: alpha(basePalette.forest.dark, opacity.backdrop),

    // Elevation system - enhanced contrast
    shadow: basePalette.forest.dark,
    elevation1: elevation.light.level1,
    elevation2: elevation.light.level2,
    elevation3: elevation.light.level3,

    // Reading experience - improved visibility
    wordTooltipBg: basePalette.pure.white,
    wordTooltipText: basePalette.forest.darkest,
    wordTooltipBorder: basePalette.sage.light,
    wordTooltipShadow: alpha(basePalette.forest.dark, opacity.active),
    wordSelectionUnderline: alpha(basePalette.tint.primary, opacity.selection),
    wordDueUnderline: alpha(basePalette.semantic.warning, opacity.due),

    // Navigation - adjusted for new background
    navigationRipple: alpha(basePalette.tint.primary, opacity.strong),
    headerOverlay: alpha(basePalette.sage.lighter, opacity.header),
    tabBarOverlay: alpha(basePalette.sage.lighter, opacity.modal),

    // UI semantics
    progressIndicator: basePalette.tint.primary,
    progressBackground: alpha(basePalette.tint.primary, opacity.progress),
    interactiveSecondary: basePalette.forest.light,
    completionSuccess: basePalette.semantic.success,

    // Utility colors - enhanced contrast
    imagePlaceholder: basePalette.sage.light,
    textOverlay: alpha(basePalette.tint.primary, opacity.subtle),
    textShadowDark: alpha(basePalette.forest.dark, opacity.shadow),
    textShadowLight: alpha(basePalette.pure.white, opacity.shadow),
    modalIndicator: basePalette.forest.lighter,
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,

  dark: {
    // Core brand colors
    primary: basePalette.pure.white,
    background: basePalette.sage.darkest,
    text: basePalette.pure.white,
    secondaryText: textHierarchy.dark.subtitle,
    textTertiary: textHierarchy.dark.metadata,
    border: basePalette.sage.medium,
    card: basePalette.sage.dark,
    cardBorder: basePalette.sage.medium,

    // Semantic colors - dark variants
    error: basePalette.semantic.errorDark,
    success: basePalette.semantic.successDark,
    warning: basePalette.semantic.warningDark,
    info: basePalette.forest.lighter,

    // Text hierarchy - dark mode optimized
    englishText: textHierarchy.dark.subtitle,
    arabicText: basePalette.pure.white,
    authorText: textHierarchy.dark.metadata,
    headingText: basePalette.pure.white,
    subtitleText: textHierarchy.dark.subtitle,
    metadataText: textHierarchy.dark.metadata,
    captionText: textHierarchy.dark.caption,

    // Interactive elements
    tint: basePalette.tint.primaryDark,
    tabIconDefault: basePalette.forest.light,
    tabIconSelected: basePalette.tint.primaryDark,
    icon: textHierarchy.dark.metadata,
    disabled: basePalette.sage.medium,

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
    wordTooltipBg: basePalette.sage.medium,
    wordTooltipText: basePalette.pure.white,
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
    interactiveSecondary: textHierarchy.dark.metadata,
    completionSuccess: basePalette.semantic.successDark,

    // Utility colors
    imagePlaceholder: basePalette.sage.medium,
    textOverlay: alpha(basePalette.tint.primaryDark, opacity.light),
    textShadowDark: alpha(basePalette.pure.black, opacity.shadow),
    textShadowLight: alpha(basePalette.pure.white, opacity.shadow),
    modalIndicator: basePalette.forest.light,
    white: basePalette.pure.white,
    black: basePalette.pure.black,
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
