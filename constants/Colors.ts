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
    mediumDark: '#1E2720', // Rich sage border
    medium: '#2A352D', // Rich sage border
    light: '#E8F1EC', // Refined sage border
    lighter: '#F2F7F4', // Whisper-soft sage
    lightest: '#F8FAF9', // Crisp warm white
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
    warning: '#C9B938', // Rich goldenrod
    warningDark: '#E0CC78', // Enriched gold for dark
  },

  // Green-tinted pure values (never pure white/black)
  pure: {
    white: '#F2F6F4', // Subtle green-tinted white
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
    subtitle: '#35463E', // 25% blend between darkest and medium - Use for: section headers, card subtitles
    metadata: '#5C6F65', // 50% blend between medium and light - Use for: timestamps, author names, secondary info
    caption: '#5E7268', // 75% blend between medium and light - Use for: help text, placeholders, tertiary info
  },
  dark: {
    subtitle: '#E6EAE7', // Light mode equivalent - Use for: section headers, card subtitles
    metadata: '#CAD3CC', // Light mode equivalent - Use for: timestamps, author names, secondary info
    caption: '#BDC6BF', // Light mode equivalent - Use for: help text, placeholders, tertiary info
  },
};

// Standardized opacity system - Designed for consistent visual hierarchy
const opacity = {
  subtle: 0.04, // Very subtle overlays - Use for: light background tints
  light: 0.06, // Light overlays - Use for: hover states on light backgrounds
  medium: 0.08, // Standard hover states - Use for: button hovers, card highlights
  strong: 0.1, // Active backgrounds - Use for: pressed states, active tabs
  active: 0.12, // Strong active states - Use for: selected items, focus rings
  border: 0.15, // Border overlays - Use for: subtle borders, dividers
  progress: 0.15, // Progress backgrounds - Use for: progress bar tracks
  disabled: 0.2, // Disabled backgrounds - Use for: disabled button states
  selection: 0.28, // Text selection - Use for: text selection highlights
  tooltip: 0.32, // Tooltips and shadows - Use for: tooltip backgrounds, light shadows
  due: 0.42, // Due word indicators - Use for: vocabulary due indicators
  overlay: 0.52, // Strong overlays - Use for: modal content overlays
  backdrop: 0.68, // Modal backdrops - Use for: modal background overlays
  shadow: 0.75, // Text shadows - Use for: text shadow effects
  darkBackdrop: 0.85, // Dark mode backdrops - Use for: dark theme modal backgrounds
  modal: 0.92, // Modal overlays - Use for: full modal backgrounds
  header: 0.96, // Header overlays - Use for: navigation header backgrounds
  full: 0.97, // Full modal overlays - Use for: maximum opacity overlays
};

// Elevation system
const elevation = {
  light: {
    level0: basePalette.sage.lighter, // Background - matches current background
    level1: basePalette.pure.white, // Cards (green-tinted white)
    level2: basePalette.sage.lightest, // Raised elements - use palette reference
    level3: basePalette.sage.lighter, // Floating elements
  },
  dark: {
    level0: basePalette.sage.darkest, // Background - matches current background
    level1: basePalette.sage.dark, // Cards
    level2: basePalette.sage.mediumDark, // Raised elements
    level3: basePalette.sage.medium, // Floating elements - use consistent reference
  },
};

/**
 * ELEVATION HIERARCHY GUIDE
 *
 * Use elevations intelligently to create proper visual hierarchy:
 *
 * Level 0 (elevation0): Base surfaces
 * - ThemedView backgrounds
 * - Screen backgrounds
 * - Base container backgrounds
 *
 * Level 1 (elevation1): Primary surfaces
 * - Cards (BaseCard, ArticleCard)
 * - Input fields
 * - Primary buttons (inactive state)
 * - Modal backgrounds
 * - Bottom sheets
 *
 * Level 2 (elevation2): Raised surfaces
 * - Active/selected states
 * - Hover states
 * - Cards inside modals (raised above modal background)
 * - Icon containers in cards
 * - Raised buttons
 * - Secondary interactive elements
 *
 * Level 3 (elevation3): Floating surfaces
 * - Tooltips
 * - Dropdowns
 * - Floating action buttons
 * - Overlays
 * - Toast messages
 *
 * RULES:
 * 1. Always start with level 0 for base components
 * 2. Each stacked component should use the next elevation level
 * 3. Interactive states can temporarily elevate (e.g., level1 → level2 on press)
 * 4. Never skip elevation levels in the same component hierarchy
 * 5. Use shadows (LAYOUT.ELEVATION) for visual depth, colors for surface hierarchy
 * 6. Cards inside modals use elevation2 to be raised above modal background (elevation1)
 */

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
    tintBackground: alpha(basePalette.tint.primary, opacity.medium), // Common tint + 0.08 pattern
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
    elevation0: elevation.light.level0,
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
    tintBackground: alpha(basePalette.tint.primaryDark, opacity.medium), // Common tint + 0.08 pattern
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
    elevation0: elevation.dark.level0,
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

// Simple validation helpers - Use these to verify critical color relationships
export const colorValidation = {
  // Critical text/background pairs that must maintain accessibility
  criticalPairs: ['text on background', 'text on card', 'tint on background'] as const,
  // Opacity levels that work well for interactive states
  safeOpacityRange: { min: 0.08, max: 0.15 } as const,
} as const;
