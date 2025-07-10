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

  // Educational Chart Colors - Unified sage-green system for visual cohesion
  charts: {
    // Supporting chart elements only - main colors use tint directly
    ui: {
      grid: '#E8F1EC', // Subtle grid lines (light mode)
      gridDark: '#2A352D', // Subtle grid lines (dark mode)
      threshold: '#9AB5A4', // Reference lines for targets
      thresholdDark: '#748A7C', // Reference lines for dark mode
    },
  },

  // Semantic warm tones
  semantic: {
    error: '#B85454', // Muted sage-toned red - matches sage green saturation/lightness
    errorDark: '#D17676', // Lighter muted red for dark mode
    success: '#4C7F5A', // Deep forest success
    successDark: '#72A47F', // Lighter forest for dark mode
    warning: '#B8954B', // Muted sage-toned gold - matches sage green tone
    warningDark: '#D1B56F', // Lighter muted gold for dark mode
  },

  // Green-tinted pure values (never pure white/black)
  pure: {
    white: '#FEFEFE', // True white with subtle green tint (same as elevation3)
    black: '#0A0F0B', // Subtle green-tinted black
    transparent: 'transparent',
  },

  // Sepia-tinted pure values for autumn theme
  sepiaPure: {
    white: '#FEFCF9', // Warm sepia white (instead of pure white)
    black: '#0F0B0A', // Subtle sepia-tinted black (warm brown-black)
  },

  // Autumn sepia palette - warm, nostalgic tones inspired by fallen leaves
  autumn: {
    // Core sepia-brown family
    darkest: '#2A1810', // Deep espresso text
    dark: '#3D251A', // Rich coffee brown (primary)
    medium: '#5C3A27', // Balanced chestnut
    light: '#8B6342', // Warm caramel
    lighter: '#B8926A', // Light amber

    // Warm sepia backgrounds
    paper: {
      darkest: '#1F1611', // Deep sepia background
      dark: '#2B1F18', // Rich parchment cards
      mediumDark: '#332520', // Warm border tone
      medium: '#3F2E26', // Medium sepia border
      light: '#F5E6D3', // Soft parchment border
      lighter: '#F7E9D8', // Warm cream background
      lightest: '#FAF0E6', // Pristine parchment white
    },

    // Interactive autumn tints
    accent: {
      primary: '#A0662F', // Rich amber tint - sepia mode
      primaryDark: '#C08552', // Lighter amber tint - future dark sepia mode
    },

    // Sepia semantic colors
    semantic: {
      error: '#C85A4A', // Warm muted red - matches sepia saturation
      errorDark: '#E07A6B', // Lighter warm red for dark sepia mode
      success: '#7A8B3A', // Muted olive success
      successDark: '#9BAA5A', // Lighter olive for dark sepia mode
      warning: '#D4941A', // Rich golden amber warning
      warningDark: '#E8B347', // Lighter golden amber for dark sepia mode
    },
  },
} as const;

// Helper to apply opacity to a hex color
const applyOpacity = (color: string, opacity: number): string =>
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
  sepia: {
    subtitle: '#4A2F1F', // 25% blend for sepia hierarchy - Use for: section headers, card subtitles
    metadata: '#6B4530', // 50% blend for sepia hierarchy - Use for: timestamps, author names, secondary info
    caption: '#7A5138', // 75% blend for sepia hierarchy - Use for: help text, placeholders, tertiary info
  },
} as const;

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
} as const;

// Elevation system
const elevation = {
  light: {
    level0: basePalette.sage.lighter, // Background - #F2F7F4 (matches background color)
    level1: basePalette.sage.lightest, // Cards - #F8FAF9 (elevated above background)
    level2: '#FCFDFC', // Raised elements - calculated to be lighter than level1 for proper elevation
    level3: '#FEFEFE', // Floating elements - calculated for maximum visual elevation
  },
  dark: {
    level0: basePalette.sage.darkest, // Background - matches current background
    level1: basePalette.sage.dark, // Cards
    level2: basePalette.sage.mediumDark, // Raised elements
    level3: basePalette.sage.medium, // Floating elements - use consistent reference
  },
  sepia: {
    level0: basePalette.autumn.paper.lighter, // Background - warm cream tone
    level1: basePalette.autumn.paper.lightest, // Cards - pristine parchment
    level2: '#FCFAF7', // Raised elements - warmer than level1
    level3: basePalette.sepiaPure.white, // Floating elements - warm sepia white (more sepia than pure white)
  },
} as const;

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

const lightColors: ThemeColors = {
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
  tintBackground: applyOpacity(basePalette.tint.primary, opacity.medium), // Common tint + 0.08 pattern
  tabIconDefault: basePalette.forest.lighter,
  tabIconSelected: basePalette.tint.primary,
  icon: basePalette.forest.light,
  disabled: basePalette.forest.lighter,

  // Overlays - adjusted for new background
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.sage.lighter, opacity.modal),
  modalOverlay: applyOpacity(basePalette.sage.lighter, opacity.full),
  borderOverlay: applyOpacity(basePalette.tint.primary, opacity.light),
  buttonOverlay: applyOpacity(basePalette.tint.primary, opacity.medium),
  backdropOverlay: applyOpacity(basePalette.forest.dark, opacity.backdrop),

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
  wordTooltipShadow: applyOpacity(basePalette.forest.dark, opacity.active),
  wordSelectionUnderline: applyOpacity(basePalette.tint.primary, opacity.selection),
  wordDueUnderline: applyOpacity(basePalette.semantic.warning, opacity.due),

  // Navigation - adjusted for new background
  navigationRipple: applyOpacity(basePalette.tint.primary, opacity.strong),
  headerOverlay: applyOpacity(basePalette.sage.lighter, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.sage.lighter, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primary,
  progressBackground: applyOpacity(basePalette.tint.primary, opacity.progress),
  interactiveSecondary: basePalette.forest.light,
  completionSuccess: basePalette.semantic.success,

  // Chart UI colors - simplified
  chartGrid: basePalette.charts.ui.grid,
  chartThreshold: basePalette.charts.ui.threshold,

  // Utility colors - enhanced contrast
  textOverlay: applyOpacity(basePalette.tint.primary, opacity.subtle),
  textShadowDark: applyOpacity(basePalette.forest.dark, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.lighter,
  white: basePalette.pure.white,
  black: basePalette.pure.black,
} as const;

const darkColors: ThemeColors = {
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
  tintBackground: applyOpacity(basePalette.tint.primaryDark, opacity.medium), // Common tint + 0.08 pattern
  tabIconDefault: basePalette.forest.light,
  tabIconSelected: basePalette.tint.primaryDark,
  icon: textHierarchy.dark.metadata,
  disabled: basePalette.sage.medium,

  // Overlays - dark mode with standardized opacity
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.sage.darkest, opacity.modal),
  modalOverlay: applyOpacity(basePalette.sage.darkest, opacity.full),
  borderOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.medium),
  buttonOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.strong),
  backdropOverlay: applyOpacity(basePalette.sage.darkest, opacity.darkBackdrop),

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
  wordTooltipShadow: applyOpacity(basePalette.pure.black, opacity.due),
  wordSelectionUnderline: applyOpacity(basePalette.tint.primaryDark, opacity.tooltip),
  wordDueUnderline: applyOpacity(basePalette.semantic.warningDark, opacity.overlay),

  // Navigation
  navigationRipple: applyOpacity(basePalette.tint.primaryDark, opacity.active),
  headerOverlay: applyOpacity(basePalette.sage.darkest, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.sage.darkest, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primaryDark,
  progressBackground: applyOpacity(basePalette.tint.primaryDark, opacity.disabled),
  interactiveSecondary: textHierarchy.dark.metadata,
  completionSuccess: basePalette.semantic.successDark,

  // Chart UI colors - simplified
  chartGrid: basePalette.charts.ui.gridDark,
  chartThreshold: basePalette.charts.ui.thresholdDark,

  // Utility colors
  textOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.light),
  textShadowDark: applyOpacity(basePalette.pure.black, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.light,
  white: basePalette.pure.white,
  black: basePalette.pure.black,
} as const;

const sepiaColors: ThemeColors = {
  // Core brand colors - warm sepia tones
  primary: basePalette.autumn.dark,
  background: basePalette.autumn.paper.lighter, // Warm cream background
  text: basePalette.autumn.darkest,
  secondaryText: basePalette.autumn.medium,
  textTertiary: basePalette.autumn.light,
  border: basePalette.autumn.paper.light,
  card: basePalette.sepiaPure.white, // Warm sepia white cards - matches elevation3 for consistency
  cardBorder: basePalette.autumn.paper.light,

  // Semantic colors - sepia variants
  error: basePalette.autumn.semantic.error,
  success: basePalette.autumn.semantic.success,
  warning: basePalette.autumn.semantic.warning,
  info: basePalette.autumn.light,

  // Text hierarchy - sepia mode optimized for warmth
  englishText: basePalette.autumn.medium,
  arabicText: basePalette.autumn.darkest,
  authorText: basePalette.autumn.light,
  headingText: basePalette.autumn.darkest,
  subtitleText: textHierarchy.sepia.subtitle,
  metadataText: textHierarchy.sepia.metadata,
  captionText: textHierarchy.sepia.caption,

  // Interactive elements - warm amber tones
  tint: basePalette.autumn.accent.primary,
  tintBackground: applyOpacity(basePalette.autumn.accent.primary, opacity.medium),
  tabIconDefault: basePalette.autumn.lighter,
  tabIconSelected: basePalette.autumn.accent.primary,
  icon: basePalette.autumn.light,
  disabled: basePalette.autumn.lighter,

  // Overlays - warm sepia overlays
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.modal),
  modalOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.full),
  borderOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.light),
  buttonOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.medium),
  backdropOverlay: applyOpacity(basePalette.autumn.dark, opacity.backdrop),

  // Elevation system - sepia elevations
  shadow: basePalette.autumn.dark,
  elevation0: elevation.sepia.level0,
  elevation1: elevation.sepia.level1,
  elevation2: elevation.sepia.level2,
  elevation3: elevation.sepia.level3,

  // Reading experience - optimized for warm, paper-like reading
  wordTooltipBg: basePalette.sepiaPure.white, // Warm sepia white for tooltips
  wordTooltipText: basePalette.autumn.darkest,
  wordTooltipBorder: basePalette.autumn.paper.light,
  wordTooltipShadow: applyOpacity(basePalette.autumn.dark, opacity.active),
  wordSelectionUnderline: applyOpacity(basePalette.autumn.accent.primary, opacity.selection),
  wordDueUnderline: applyOpacity(basePalette.autumn.semantic.warning, opacity.due),

  // Navigation - warm sepia navigation
  navigationRipple: applyOpacity(basePalette.autumn.accent.primary, opacity.strong),
  headerOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.modal),

  // UI semantics - sepia UI elements
  progressIndicator: basePalette.autumn.accent.primary,
  progressBackground: applyOpacity(basePalette.autumn.accent.primary, opacity.progress),
  interactiveSecondary: basePalette.autumn.light,
  completionSuccess: basePalette.autumn.semantic.success,

  // Chart UI colors - warm sepia charts
  chartGrid: basePalette.autumn.paper.light,
  chartThreshold: basePalette.autumn.lighter,

  // Utility colors - sepia utilities
  textOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.subtle),
  textShadowDark: applyOpacity(basePalette.autumn.dark, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.sepiaPure.white, opacity.shadow), // Use sepia white for text shadows
  modalIndicator: basePalette.autumn.lighter,
  white: basePalette.sepiaPure.white, // Use warm sepia white instead of pure white
  black: basePalette.sepiaPure.black, // Use warm sepia-tinted black
} as const;

export const Colors = { light: lightColors, dark: darkColors, sepia: sepiaColors } as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Sepia = 'sepia',
}

export type ColorName = keyof typeof Colors.light;

// Simple validation helpers - Use these to verify critical color relationships
export const colorValidation = {
  // Critical text/background pairs that must maintain accessibility
  criticalPairs: ['text on background', 'text on card', 'tint on background'] as const,
  // Opacity levels that work well for interactive states
  safeOpacityRange: { min: 0.08, max: 0.15 } as const,
} as const;
