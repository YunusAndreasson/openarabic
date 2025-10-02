/**
 * OpenArabic Color System - OKLCH Based
 *
 * This version uses OKLCH color space while preserving exact visual appearance
 * of the original hex-based colors. All colors have been reverse-engineered
 * from existing hex values to maintain perfect backwards compatibility.
 *
 * OKLCH Benefits:
 * - Perceptually uniform: Equal lightness changes = equal visual brightness changes
 * - Predictable contrast: Easier to calculate WCAG compliance
 * - Future-proof: Can adjust entire palettes by tweaking L/C/H values
 * - Better gradients: Smoother color transitions
 */

import type { ThemeColors } from '@/types/ui/theme.types';
import { oklchToHex } from '@/utils/colorUtils';

// =============================================================================
// OKLCH PALETTE DEFINITIONS (Reverse-engineered from existing hex colors)
// =============================================================================

/**
 * Forest Green Family - Core sage-green tones
 * Hue range: 157-168° (blue-green)
 */
const forestOKLCH = {
  darkest:  { l: 0.2711, c: 0.0272, h: 163.6 },  // #1A2B23
  dark:     { l: 0.3389, c: 0.0253, h: 167.6 },  // #2B3C35
  medium:   { l: 0.4539, c: 0.0255, h: 162.1 },  // #4A5B52
  light:    { l: 0.5756, c: 0.0315, h: 158.1 },  // #6A7F72
  lighter:  { l: 0.7478, c: 0.0382, h: 157.7 },  // #9AB5A4
} as const;

/**
 * Sage Backgrounds - Neutral green-tinted surfaces
 * Dark mode: Perceptually uniform ~4.5% lightness steps for smoother elevation
 * Hue range: 151-167° (subtle green tint)
 */
const sageOKLCH = {
  darkest:    { l: 0.19, c: 0.012, h: 160.0 },      // Polished: even elevation base
  dark:       { l: 0.235, c: 0.014, h: 158.0 },     // Polished: +4.5% L step
  mediumDark: { l: 0.28, c: 0.016, h: 156.0 },      // Polished: +4.5% L step
  medium:     { l: 0.325, c: 0.018, h: 155.0 },     // Polished: +4.5% L step
  light:      { l: 0.9500, c: 0.0116, h: 162.0 },   // #E8F1EC (unchanged)
  lighter:    { l: 0.9715, c: 0.0066, h: 160.1 },   // #F2F7F4 (unchanged)
  lightest:   { l: 0.9833, c: 0.0025, h: 165.1 },   // #F8FAF9 (unchanged)
} as const;

/**
 * Tint Colors - Primary interactive sage
 * Hue range: 151-156° (sage green)
 */
const tintOKLCH = {
  primary:     { l: 0.5624, c: 0.0541, h: 156.2 },  // #5B7F68
  primaryDark: { l: 0.7323, c: 0.0560, h: 151.5 },  // #8FB397
} as const;

/**
 * Semantic Colors - Status indicators
 */
const semanticOKLCH = {
  error:       { l: 0.5680, c: 0.2002, h: 26.4 },   // #D32F2F
  errorDark:   { l: 0.6427, c: 0.2153, h: 28.8 },   // #F44336
  success:     { l: 0.5498, c: 0.0799, h: 151.8 },  // #4C7F5A
  successDark: { l: 0.6728, c: 0.0764, h: 152.1 },  // #72A47F
  warning:     { l: 0.6870, c: 0.1017, h: 84.2 },   // #B8954B
  warningDark: { l: 0.7820, c: 0.0949, h: 88.4 },   // #D1B56F
} as const;

/**
 * Pure Values - Green-tinted neutrals
 */
const pureOKLCH = {
  white: { l: 0.9965, c: 0.0026, h: 106.4 },        // #FEFEFC
  black: { l: 0.1613, c: 0.0115, h: 150.9 },        // #0A0F0B
} as const;

/**
 * Sepia Pure Values
 */
const sepiaPureOKLCH = {
  white: { l: 0.9912, c: 0.0069, h: 88.6 },         // #FEFCF7
  black: { l: 0.1544, c: 0.0073, h: 34.3 },         // #0F0B0A
} as const;

/**
 * Autumn Sepia Family - Warm nostalgic tones
 * Hue range: 44-68° (orange-brown)
 */
const autumnOKLCH = {
  darkest:  { l: 0.2308, c: 0.0327, h: 44.7 },      // #2A1810
  dark:     { l: 0.2918, c: 0.0414, h: 45.3 },      // #3D251A
  medium:   { l: 0.3839, c: 0.0570, h: 49.6 },      // #5C3A27
  light:    { l: 0.5335, c: 0.0702, h: 60.0 },      // #8B6342
  lighter:  { l: 0.6858, c: 0.0713, h: 67.6 },      // #B8926A
} as const;

/**
 * Autumn Paper - Parchment backgrounds
 * Hue range: 40-74° (warm sepia)
 */
const autumnPaperOKLCH = {
  darkest:    { l: 0.2098, c: 0.0176, h: 50.5 },    // #1F1611
  dark:       { l: 0.2516, c: 0.0227, h: 51.6 },    // #2B1F18
  mediumDark: { l: 0.2794, c: 0.0233, h: 40.5 },    // #332520
  medium:     { l: 0.3183, c: 0.0287, h: 46.4 },    // #3F2E26
  light:      { l: 0.9319, c: 0.0301, h: 73.9 },    // #F5E6D3
  lighter:    { l: 0.9406, c: 0.0273, h: 72.8 },    // #F7E9D8
  lightest:   { l: 0.9602, c: 0.0171, h: 67.6 },    // #FAF0E6
} as const;

/**
 * Autumn Accent - Interactive amber
 * Hue range: 60-62° (rich amber)
 */
const autumnAccentOKLCH = {
  primary:     { l: 0.5627, c: 0.1025, h: 61.5 },   // #A0662F
  primaryDark: { l: 0.6652, c: 0.0990, h: 60.7 },   // #C08552
} as const;

/**
 * Autumn Semantic Colors
 */
const autumnSemanticOKLCH = {
  error:       { l: 0.6019, c: 0.1438, h: 30.2 },   // #C85A4A
  errorDark:   { l: 0.6900, c: 0.1295, h: 29.5 },   // #E07A6B
  success:     { l: 0.6054, c: 0.1085, h: 119.7 },  // #7A8B3A
  successDark: { l: 0.7082, c: 0.1065, h: 117.9 },  // #9BAA5A
  warning:     { l: 0.7119, c: 0.1432, h: 76.5 },   // #D4941A
  warningDark: { l: 0.7961, c: 0.1366, h: 82.0 },   // #E8B347
} as const;

/**
 * Text Hierarchy - Perceptually uniform progressions
 * Dark mode: Even 6% lightness steps with consistent chroma for harmony
 */
const textHierarchyOKLCH = {
  light: {
    subtitle:          { l: 0.3767, c: 0.0256, h: 164.7 },  // #35463E (unchanged)
    metadata:          { l: 0.5229, c: 0.0276, h: 162.4 },  // #5C6F65 (unchanged)
    secondaryMetadata: { l: 0.6295, c: 0.0309, h: 158.2 },  // #7A8F82 (unchanged)
    caption:           { l: 0.5326, c: 0.0284, h: 163.7 },  // #5E7268 (unchanged)
  },
  dark: {
    subtitle:          { l: 0.93, c: 0.012, h: 157.0 },     // Polished: brightest, uniform chroma
    metadata:          { l: 0.87, c: 0.012, h: 157.0 },     // Polished: -6% L step
    caption:           { l: 0.81, c: 0.012, h: 157.0 },     // Polished: -6% L step
    secondaryMetadata: { l: 0.75, c: 0.012, h: 157.0 },     // Polished: -6% L step, most subtle
  },
  sepia: {
    subtitle:          { l: 0.3337, c: 0.0476, h: 51.1 },   // #4A2F1F
    metadata:          { l: 0.4287, c: 0.0619, h: 49.4 },   // #6B4530
    secondaryMetadata: { l: 0.5495, c: 0.0624, h: 65.0 },   // #8B6A4A
    caption:           { l: 0.4742, c: 0.0668, h: 51.9 },   // #7A5138
  },
} as const;

// =============================================================================
// CONVERT OKLCH TO HEX
// =============================================================================

const forest = {
  darkest: oklchToHex(forestOKLCH.darkest.l, forestOKLCH.darkest.c, forestOKLCH.darkest.h),
  dark:    oklchToHex(forestOKLCH.dark.l, forestOKLCH.dark.c, forestOKLCH.dark.h),
  medium:  oklchToHex(forestOKLCH.medium.l, forestOKLCH.medium.c, forestOKLCH.medium.h),
  light:   oklchToHex(forestOKLCH.light.l, forestOKLCH.light.c, forestOKLCH.light.h),
  lighter: oklchToHex(forestOKLCH.lighter.l, forestOKLCH.lighter.c, forestOKLCH.lighter.h),
} as const;

const sage = {
  darkest:    oklchToHex(sageOKLCH.darkest.l, sageOKLCH.darkest.c, sageOKLCH.darkest.h),
  dark:       oklchToHex(sageOKLCH.dark.l, sageOKLCH.dark.c, sageOKLCH.dark.h),
  mediumDark: oklchToHex(sageOKLCH.mediumDark.l, sageOKLCH.mediumDark.c, sageOKLCH.mediumDark.h),
  medium:     oklchToHex(sageOKLCH.medium.l, sageOKLCH.medium.c, sageOKLCH.medium.h),
  light:      oklchToHex(sageOKLCH.light.l, sageOKLCH.light.c, sageOKLCH.light.h),
  lighter:    oklchToHex(sageOKLCH.lighter.l, sageOKLCH.lighter.c, sageOKLCH.lighter.h),
  lightest:   oklchToHex(sageOKLCH.lightest.l, sageOKLCH.lightest.c, sageOKLCH.lightest.h),
} as const;

const tint = {
  primary:     oklchToHex(tintOKLCH.primary.l, tintOKLCH.primary.c, tintOKLCH.primary.h),
  primaryDark: oklchToHex(tintOKLCH.primaryDark.l, tintOKLCH.primaryDark.c, tintOKLCH.primaryDark.h),
} as const;

const semantic = {
  error:       oklchToHex(semanticOKLCH.error.l, semanticOKLCH.error.c, semanticOKLCH.error.h),
  errorDark:   oklchToHex(semanticOKLCH.errorDark.l, semanticOKLCH.errorDark.c, semanticOKLCH.errorDark.h),
  success:     oklchToHex(semanticOKLCH.success.l, semanticOKLCH.success.c, semanticOKLCH.success.h),
  successDark: oklchToHex(semanticOKLCH.successDark.l, semanticOKLCH.successDark.c, semanticOKLCH.successDark.h),
  warning:     oklchToHex(semanticOKLCH.warning.l, semanticOKLCH.warning.c, semanticOKLCH.warning.h),
  warningDark: oklchToHex(semanticOKLCH.warningDark.l, semanticOKLCH.warningDark.c, semanticOKLCH.warningDark.h),
} as const;

const pure = {
  white: oklchToHex(pureOKLCH.white.l, pureOKLCH.white.c, pureOKLCH.white.h),
  black: oklchToHex(pureOKLCH.black.l, pureOKLCH.black.c, pureOKLCH.black.h),
  transparent: 'transparent',
} as const;

const sepiaPure = {
  white: oklchToHex(sepiaPureOKLCH.white.l, sepiaPureOKLCH.white.c, sepiaPureOKLCH.white.h),
  black: oklchToHex(sepiaPureOKLCH.black.l, sepiaPureOKLCH.black.c, sepiaPureOKLCH.black.h),
} as const;

const autumn = {
  darkest: oklchToHex(autumnOKLCH.darkest.l, autumnOKLCH.darkest.c, autumnOKLCH.darkest.h),
  dark:    oklchToHex(autumnOKLCH.dark.l, autumnOKLCH.dark.c, autumnOKLCH.dark.h),
  medium:  oklchToHex(autumnOKLCH.medium.l, autumnOKLCH.medium.c, autumnOKLCH.medium.h),
  light:   oklchToHex(autumnOKLCH.light.l, autumnOKLCH.light.c, autumnOKLCH.light.h),
  lighter: oklchToHex(autumnOKLCH.lighter.l, autumnOKLCH.lighter.c, autumnOKLCH.lighter.h),
  paper: {
    darkest:    oklchToHex(autumnPaperOKLCH.darkest.l, autumnPaperOKLCH.darkest.c, autumnPaperOKLCH.darkest.h),
    dark:       oklchToHex(autumnPaperOKLCH.dark.l, autumnPaperOKLCH.dark.c, autumnPaperOKLCH.dark.h),
    mediumDark: oklchToHex(autumnPaperOKLCH.mediumDark.l, autumnPaperOKLCH.mediumDark.c, autumnPaperOKLCH.mediumDark.h),
    medium:     oklchToHex(autumnPaperOKLCH.medium.l, autumnPaperOKLCH.medium.c, autumnPaperOKLCH.medium.h),
    light:      oklchToHex(autumnPaperOKLCH.light.l, autumnPaperOKLCH.light.c, autumnPaperOKLCH.light.h),
    lighter:    oklchToHex(autumnPaperOKLCH.lighter.l, autumnPaperOKLCH.lighter.c, autumnPaperOKLCH.lighter.h),
    lightest:   oklchToHex(autumnPaperOKLCH.lightest.l, autumnPaperOKLCH.lightest.c, autumnPaperOKLCH.lightest.h),
  },
  accent: {
    primary:     oklchToHex(autumnAccentOKLCH.primary.l, autumnAccentOKLCH.primary.c, autumnAccentOKLCH.primary.h),
    primaryDark: oklchToHex(autumnAccentOKLCH.primaryDark.l, autumnAccentOKLCH.primaryDark.c, autumnAccentOKLCH.primaryDark.h),
  },
  semantic: {
    error:       oklchToHex(autumnSemanticOKLCH.error.l, autumnSemanticOKLCH.error.c, autumnSemanticOKLCH.error.h),
    errorDark:   oklchToHex(autumnSemanticOKLCH.errorDark.l, autumnSemanticOKLCH.errorDark.c, autumnSemanticOKLCH.errorDark.h),
    success:     oklchToHex(autumnSemanticOKLCH.success.l, autumnSemanticOKLCH.success.c, autumnSemanticOKLCH.success.h),
    successDark: oklchToHex(autumnSemanticOKLCH.successDark.l, autumnSemanticOKLCH.successDark.c, autumnSemanticOKLCH.successDark.h),
    warning:     oklchToHex(autumnSemanticOKLCH.warning.l, autumnSemanticOKLCH.warning.c, autumnSemanticOKLCH.warning.h),
    warningDark: oklchToHex(autumnSemanticOKLCH.warningDark.l, autumnSemanticOKLCH.warningDark.c, autumnSemanticOKLCH.warningDark.h),
  },
} as const;

const textHierarchy = {
  light: {
    subtitle:          oklchToHex(textHierarchyOKLCH.light.subtitle.l, textHierarchyOKLCH.light.subtitle.c, textHierarchyOKLCH.light.subtitle.h),
    metadata:          oklchToHex(textHierarchyOKLCH.light.metadata.l, textHierarchyOKLCH.light.metadata.c, textHierarchyOKLCH.light.metadata.h),
    secondaryMetadata: oklchToHex(textHierarchyOKLCH.light.secondaryMetadata.l, textHierarchyOKLCH.light.secondaryMetadata.c, textHierarchyOKLCH.light.secondaryMetadata.h),
    caption:           oklchToHex(textHierarchyOKLCH.light.caption.l, textHierarchyOKLCH.light.caption.c, textHierarchyOKLCH.light.caption.h),
  },
  dark: {
    subtitle:          oklchToHex(textHierarchyOKLCH.dark.subtitle.l, textHierarchyOKLCH.dark.subtitle.c, textHierarchyOKLCH.dark.subtitle.h),
    metadata:          oklchToHex(textHierarchyOKLCH.dark.metadata.l, textHierarchyOKLCH.dark.metadata.c, textHierarchyOKLCH.dark.metadata.h),
    secondaryMetadata: oklchToHex(textHierarchyOKLCH.dark.secondaryMetadata.l, textHierarchyOKLCH.dark.secondaryMetadata.c, textHierarchyOKLCH.dark.secondaryMetadata.h),
    caption:           oklchToHex(textHierarchyOKLCH.dark.caption.l, textHierarchyOKLCH.dark.caption.c, textHierarchyOKLCH.dark.caption.h),
  },
  sepia: {
    subtitle:          oklchToHex(textHierarchyOKLCH.sepia.subtitle.l, textHierarchyOKLCH.sepia.subtitle.c, textHierarchyOKLCH.sepia.subtitle.h),
    metadata:          oklchToHex(textHierarchyOKLCH.sepia.metadata.l, textHierarchyOKLCH.sepia.metadata.c, textHierarchyOKLCH.sepia.metadata.h),
    secondaryMetadata: oklchToHex(textHierarchyOKLCH.sepia.secondaryMetadata.l, textHierarchyOKLCH.sepia.secondaryMetadata.c, textHierarchyOKLCH.sepia.secondaryMetadata.h),
    caption:           oklchToHex(textHierarchyOKLCH.sepia.caption.l, textHierarchyOKLCH.sepia.caption.c, textHierarchyOKLCH.sepia.caption.h),
  },
} as const;

// =============================================================================
// BASE PALETTE - Public API
// =============================================================================

const basePalette = {
  forest,
  sage,
  tint,
  semantic,
  pure,
  autumn,
  sepiaPure,
  charts: {
    ui: {
      grid: sage.light,
      gridDark: sage.medium,
      gridSepia: autumn.paper.light,
      threshold: forest.lighter,
      thresholdDark: forest.light,
      thresholdSepia: autumn.lighter,
    },
  },
} as const;

// =============================================================================
// OPACITY & ELEVATION (Unchanged from original)
// =============================================================================

// Helper to apply opacity to a hex color
const applyOpacity = (color: string, opacity: number): string =>
  `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;

const opacity = {
  subtle: 0.04,
  light: 0.06,
  medium: 0.08,
  strong: 0.1,
  active: 0.12,
  border: 0.15,
  disabled: 0.2,
  selection: 0.28,
  tooltip: 0.32,
  due: 0.42,
  overlay: 0.52,
  backdrop: 0.68,
  shadow: 0.75,
  darkBackdrop: 0.85,
  modal: 0.92,
  header: 0.96,
  full: 0.97,
} as const;

const elevation = {
  light: {
    level0: basePalette.sage.lighter,
    level1: basePalette.sage.lightest,
    level2: basePalette.pure.white,
    level3: basePalette.pure.white,
  },
  dark: {
    level0: basePalette.sage.darkest,
    level1: basePalette.sage.dark,
    level2: basePalette.sage.mediumDark,
    level3: basePalette.sage.medium,
  },
  sepia: {
    level0: basePalette.autumn.paper.lighter,
    level1: basePalette.autumn.paper.light,
    level2: basePalette.autumn.paper.lightest,
    level3: basePalette.sepiaPure.white,
  },
} as const;

// =============================================================================
// THEME COLOR DEFINITIONS (Unchanged structure from original)
// =============================================================================

const lightColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.forest.dark,
  background: basePalette.sage.lighter,
  text: basePalette.forest.darkest,
  secondaryText: basePalette.forest.medium,
  textTertiary: basePalette.forest.light,
  border: basePalette.sage.light,
  card: basePalette.pure.white,
  cardBorder: basePalette.sage.light,

  // Semantic colors
  error: basePalette.semantic.error,
  success: basePalette.semantic.success,
  warning: basePalette.semantic.warning,
  info: basePalette.forest.light,

  // Text hierarchy
  englishText: basePalette.forest.medium,
  arabicText: basePalette.forest.darkest,
  authorText: basePalette.forest.light,
  headingText: basePalette.forest.darkest,
  subtitleText: textHierarchy.light.subtitle,
  metadataText: textHierarchy.light.metadata,
  secondaryMetadataText: textHierarchy.light.secondaryMetadata,
  captionText: textHierarchy.light.caption,

  // Interactive elements
  tint: basePalette.tint.primary,
  tintBackground: applyOpacity(basePalette.tint.primary, opacity.medium),
  tabIconDefault: basePalette.forest.lighter,
  tabIconSelected: basePalette.tint.primary,
  icon: basePalette.forest.light,
  disabled: basePalette.forest.lighter,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.sage.lighter, opacity.modal),
  modalOverlay: applyOpacity(basePalette.sage.lighter, opacity.full),
  borderOverlay: applyOpacity(basePalette.tint.primary, opacity.border),
  buttonOverlay: applyOpacity(basePalette.tint.primary, opacity.medium),
  backdropOverlay: applyOpacity(basePalette.forest.dark, opacity.backdrop),

  // Elevation system
  shadow: basePalette.forest.dark,
  elevation0: elevation.light.level0,
  elevation1: elevation.light.level1,
  elevation2: elevation.light.level2,
  elevation3: elevation.light.level3,

  // Reading experience
  wordTooltipBg: basePalette.pure.white,
  wordTooltipText: basePalette.forest.darkest,
  wordTooltipBorder: basePalette.sage.light,
  wordTooltipShadow: applyOpacity(basePalette.forest.dark, opacity.active),
  wordSelectionUnderline: applyOpacity(basePalette.tint.primary, opacity.selection),
  wordDueUnderline: applyOpacity(basePalette.semantic.warning, opacity.due),

  // Navigation
  navigationRipple: applyOpacity(basePalette.tint.primary, opacity.strong),
  headerOverlay: applyOpacity(basePalette.sage.lighter, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.sage.lighter, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primary,
  progressBackground: applyOpacity(basePalette.tint.primary, opacity.border),
  interactiveSecondary: basePalette.forest.light,
  completionSuccess: basePalette.semantic.success,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.grid,
  chartThreshold: basePalette.charts.ui.threshold,

  // Utility colors
  textOverlay: applyOpacity(basePalette.tint.primary, opacity.subtle),
  textShadowDark: applyOpacity(basePalette.forest.dark, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.lighter,
  white: basePalette.pure.white,
  black: basePalette.pure.black,
} as const;

const darkColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.tint.primaryDark,
  background: basePalette.sage.darkest,
  text: basePalette.pure.white,
  secondaryText: textHierarchy.dark.subtitle,
  textTertiary: textHierarchy.dark.caption,
  border: basePalette.sage.medium,
  card: basePalette.sage.dark,
  cardBorder: basePalette.sage.medium,

  // Semantic colors
  error: basePalette.semantic.errorDark,
  success: basePalette.semantic.successDark,
  warning: basePalette.semantic.warningDark,
  info: basePalette.forest.lighter,

  // Text hierarchy
  englishText: textHierarchy.dark.subtitle,
  arabicText: basePalette.pure.white,
  authorText: textHierarchy.dark.metadata,
  headingText: basePalette.pure.white,
  subtitleText: textHierarchy.dark.subtitle,
  metadataText: textHierarchy.dark.metadata,
  secondaryMetadataText: textHierarchy.dark.secondaryMetadata,
  captionText: textHierarchy.dark.caption,

  // Interactive elements
  tint: basePalette.tint.primaryDark,
  tintBackground: applyOpacity(basePalette.tint.primaryDark, opacity.medium),
  tabIconDefault: basePalette.forest.lighter,
  tabIconSelected: basePalette.tint.primaryDark,
  icon: textHierarchy.dark.metadata,
  disabled: basePalette.sage.medium,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.sage.darkest, opacity.modal),
  modalOverlay: applyOpacity(basePalette.sage.darkest, opacity.full),
  borderOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.border),
  buttonOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.medium),
  backdropOverlay: applyOpacity(basePalette.sage.darkest, opacity.darkBackdrop),

  // Elevation system
  shadow: basePalette.pure.black,
  elevation0: elevation.dark.level0,
  elevation1: elevation.dark.level1,
  elevation2: elevation.dark.level2,
  elevation3: elevation.dark.level3,

  // Reading experience
  wordTooltipBg: basePalette.sage.medium,
  wordTooltipText: basePalette.pure.white,
  wordTooltipBorder: elevation.dark.level3,
  wordTooltipShadow: applyOpacity(basePalette.pure.black, opacity.active),
  wordSelectionUnderline: applyOpacity(basePalette.tint.primaryDark, opacity.selection),
  wordDueUnderline: applyOpacity(basePalette.semantic.warningDark, opacity.due),

  // Navigation
  navigationRipple: applyOpacity(basePalette.tint.primaryDark, opacity.active),
  headerOverlay: applyOpacity(basePalette.sage.darkest, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.sage.darkest, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primaryDark,
  progressBackground: applyOpacity(basePalette.tint.primaryDark, opacity.border),
  interactiveSecondary: textHierarchy.dark.metadata,
  completionSuccess: basePalette.semantic.successDark,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.gridDark,
  chartThreshold: basePalette.charts.ui.thresholdDark,

  // Utility colors
  textOverlay: applyOpacity(basePalette.tint.primaryDark, opacity.subtle),
  textShadowDark: applyOpacity(basePalette.pure.black, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.light,
  white: basePalette.pure.white,
  black: basePalette.pure.black,
} as const;

const sepiaColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.autumn.dark,
  background: basePalette.autumn.paper.lighter,
  text: basePalette.autumn.darkest,
  secondaryText: basePalette.autumn.medium,
  textTertiary: basePalette.autumn.light,
  border: basePalette.autumn.paper.light,
  card: basePalette.sepiaPure.white,
  cardBorder: basePalette.autumn.paper.light,

  // Semantic colors
  error: basePalette.autumn.semantic.error,
  success: basePalette.autumn.semantic.success,
  warning: basePalette.autumn.semantic.warning,
  info: basePalette.autumn.light,

  // Text hierarchy
  englishText: basePalette.autumn.medium,
  arabicText: basePalette.autumn.darkest,
  authorText: basePalette.autumn.light,
  headingText: basePalette.autumn.darkest,
  subtitleText: textHierarchy.sepia.subtitle,
  metadataText: textHierarchy.sepia.metadata,
  secondaryMetadataText: textHierarchy.sepia.secondaryMetadata,
  captionText: textHierarchy.sepia.caption,

  // Interactive elements
  tint: basePalette.autumn.accent.primary,
  tintBackground: applyOpacity(basePalette.autumn.accent.primary, opacity.medium),
  tabIconDefault: basePalette.autumn.lighter,
  tabIconSelected: basePalette.autumn.accent.primary,
  icon: basePalette.autumn.light,
  disabled: basePalette.autumn.lighter,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.modal),
  modalOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.full),
  borderOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.border),
  buttonOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.medium),
  backdropOverlay: applyOpacity(basePalette.autumn.dark, opacity.backdrop),

  // Elevation system
  shadow: basePalette.autumn.dark,
  elevation0: elevation.sepia.level0,
  elevation1: elevation.sepia.level1,
  elevation2: elevation.sepia.level2,
  elevation3: elevation.sepia.level3,

  // Reading experience
  wordTooltipBg: basePalette.sepiaPure.white,
  wordTooltipText: basePalette.autumn.darkest,
  wordTooltipBorder: basePalette.autumn.paper.light,
  wordTooltipShadow: applyOpacity(basePalette.autumn.dark, opacity.active),
  wordSelectionUnderline: applyOpacity(basePalette.autumn.accent.primary, opacity.selection),
  wordDueUnderline: applyOpacity(basePalette.autumn.semantic.warning, opacity.due),

  // Navigation
  navigationRipple: applyOpacity(basePalette.autumn.accent.primary, opacity.strong),
  headerOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.header),
  tabBarOverlay: applyOpacity(basePalette.autumn.paper.lighter, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.autumn.accent.primary,
  progressBackground: applyOpacity(basePalette.autumn.accent.primary, opacity.border),
  interactiveSecondary: basePalette.autumn.light,
  completionSuccess: basePalette.autumn.semantic.success,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.gridSepia,
  chartThreshold: basePalette.charts.ui.thresholdSepia,

  // Utility colors
  textOverlay: applyOpacity(basePalette.autumn.accent.primary, opacity.subtle),
  textShadowDark: applyOpacity(basePalette.autumn.dark, opacity.shadow),
  textShadowLight: applyOpacity(basePalette.sepiaPure.white, opacity.shadow),
  modalIndicator: basePalette.autumn.lighter,
  white: basePalette.sepiaPure.white,
  black: basePalette.sepiaPure.black,
} as const;

export const Colors = { light: lightColors, dark: darkColors, sepia: sepiaColors } as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Sepia = 'sepia',
}

export type ColorName = keyof ThemeColors;
