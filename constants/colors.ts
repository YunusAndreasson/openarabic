/**
 * OpenArabic Color System - OKLCH Based
 *
 * Uses OKLCH color space while preserving exact visual appearance of the
 * original hex-based colors. All colors have been converted from hex values
 * to maintain visual consistency.
 *
 * OKLCH Benefits:
 * - Perceptually uniform: Equal lightness changes = equal visual brightness changes
 * - Predictable contrast: Easier to calculate WCAG compliance
 * - Future-proof: Can adjust entire palettes by tweaking L/C/H values
 * - Better gradients: Smoother color transitions
 */

import type { ThemeColors } from '@/types/ui/theme.types';
import {
  convertFlatPalette,
  convertTextHierarchyPalette,
  convertThemedPalette,
  withAlpha,
} from '@/utils/colorUtils';

// =============================================================================
// OKLCH PALETTE DEFINITIONS (Reverse-engineered from existing hex colors)
// =============================================================================

/**
 * Forest Green Family - Core sage-green tones
 * Hue range: 157-168° (blue-green)
 */
const forestOKLCH = {
  darkest: { l: 0.2711, c: 0.0272, h: 163.6 }, // #1A2B23
  dark: { l: 0.3389, c: 0.0253, h: 167.6 }, // #2B3C35
  medium: { l: 0.4539, c: 0.0255, h: 162.1 }, // #4A5B52
  light: { l: 0.5756, c: 0.0315, h: 158.1 }, // #6A7F72
  lighter: { l: 0.7478, c: 0.0382, h: 157.7 }, // #9AB5A4
} as const;

/**
 * Sage Backgrounds - Neutral green-tinted surfaces
 * Dark mode: Premium 2025 - deeper backgrounds with ~4% lightness steps
 * Higher chroma (0.020-0.026) for visible sage tint on dark backgrounds
 * Hue range: 151-167° (subtle green tint)
 */
const sageOKLCH = {
  darkest: { l: 0.145, c: 0.02, h: 160.0 }, // Premium 2025: deeper + more chroma for visible tint
  dark: { l: 0.185, c: 0.022, h: 158.0 }, // Premium 2025: +4% L step
  mediumDark: { l: 0.225, c: 0.024, h: 156.0 }, // Premium 2025: +4% L step
  medium: { l: 0.265, c: 0.026, h: 155.0 }, // Premium 2025: +4% L step
  light: { l: 0.95, c: 0.0116, h: 162.0 }, // #E8F1EC (unchanged)
  lighter: { l: 0.9715, c: 0.0066, h: 160.1 }, // #F2F7F4 (unchanged)
  lightest: { l: 0.9833, c: 0.0025, h: 165.1 }, // #F8FAF9 (unchanged)
} as const;

/**
 * Tint Colors - Primary interactive sage
 * Hue range: 151-156° (sage green)
 * Chroma increased ~15% for more vibrant 2025 aesthetic
 */
const tintOKLCH = {
  primary: { l: 0.5624, c: 0.0622, h: 156.2 }, // More vibrant sage (2025 trend)
  primaryDark: { l: 0.7323, c: 0.0644, h: 151.5 }, // More vibrant sage (2025 trend)
} as const;

/**
 * Disabled State - Universal across themes
 * Desaturated mid-tone for inactive elements
 * Follows Material Design 3 and iOS HIG best practices
 */
const disabledOKLCH = {
  universal: { l: 0.46, c: 0.014, h: 160 }, // Desaturated grey-green - tuned to blend better with sage backgrounds
} as const;

/**
 * Semantic Colors - Status indicators
 */
const semanticOKLCH = {
  error: { l: 0.568, c: 0.2002, h: 26.4 }, // #D32F2F
  errorDark: { l: 0.6427, c: 0.2153, h: 28.8 }, // #F44336
  success: { l: 0.5498, c: 0.0799, h: 151.8 }, // #4C7F5A
  successDark: { l: 0.6728, c: 0.0764, h: 152.1 }, // #72A47F
  warning: { l: 0.65, c: 0.12, h: 84.2 }, // Darker, more saturated for better contrast (~6.8:1)
  warningDark: { l: 0.76, c: 0.11, h: 88.4 }, // Adjusted to maintain dark mode hierarchy
} as const;

/**
 * Azure Accent - Blue tones for diacritics and accents
 * Hue range: 210-230° (azure blue)
 * Complements sage green (tint) and golden orange (warning)
 */
const azureOKLCH = {
  light: { l: 0.55, c: 0.1, h: 230 }, // Medium azure for light mode
  dark: { l: 0.7, c: 0.12, h: 230 }, // Lighter azure for dark mode
  sepia: { l: 0.5, c: 0.08, h: 210 }, // Muted blue-gray for sepia
} as const;

/**
 * Violet - Purple tones for infixes (verb form transformations)
 * Hue range: 300-320° (purple-violet)
 * Represents transformation - the role of infixes in verb forms VII, VIII, X
 */
const violetOKLCH = {
  light: { l: 0.55, c: 0.12, h: 300 }, // Medium purple for light mode
  dark: { l: 0.72, c: 0.14, h: 300 }, // Light purple for dark mode visibility
  sepia: { l: 0.5, c: 0.1, h: 320 }, // Muted purple-pink for sepia
} as const;

/**
 * Indigo - Deep blue tones for future tense
 * Hue range: 260-270° (indigo blue)
 * Represents forward motion and temporal progression
 */
const indigoOKLCH = {
  light: { l: 0.52, c: 0.11, h: 265 }, // Rich indigo for light mode
  dark: { l: 0.68, c: 0.13, h: 265 }, // Lighter indigo for dark mode
  sepia: { l: 0.48, c: 0.09, h: 270 }, // Muted blue-purple for sepia
} as const;

/**
 * Coral - Warm terracotta for definite article
 * Hue range: 30-40° (coral/terracotta)
 * Earthy warm tone distinct from error red
 */
const coralOKLCH = {
  light: { l: 0.62, c: 0.1, h: 35 }, // Warm coral for light mode
  dark: { l: 0.72, c: 0.11, h: 35 }, // Light coral for dark mode
  sepia: { l: 0.58, c: 0.09, h: 40 }, // Terracotta for sepia mode
} as const;

/**
 * Pure Values - Green-tinted neutrals
 */
const pureOKLCH = {
  white: { l: 0.9965, c: 0.004, h: 157.0 }, // Sage-green brand tint
  black: { l: 0.1, c: 0.012, h: 150.9 }, // Premium 2025: darker for proper shadows on deep backgrounds
} as const;

/**
 * Sepia Pure Values
 */
const sepiaPureOKLCH = {
  white: { l: 0.9912, c: 0.0069, h: 88.6 }, // #FEFCF7
  black: { l: 0.1544, c: 0.0073, h: 34.3 }, // #0F0B0A
} as const;

/**
 * Grammar Color Family - Dedicated educational palette for grammar concept coloring
 * Hue range: 65-270° (golden → green → cyan → blue → purple-violet) - Extended sage-centric harmony
 * 12 perceptually distinct colors with 15-25° spacing for visual clarity
 * Common pairs (و+ي, ب+suffix) get 25° separation to prevent confusion
 * Lightness adjusts per theme: light (0.52-0.62), dark (+0.08), sepia (-0.02-0.04)
 * Chroma varies 0.08-0.13 to enhance distinction while maintaining cohesion
 */
const grammarOKLCH = {
  golden: {
    light: { l: 0.6, c: 0.11, h: 65 },
    dark: { l: 0.68, c: 0.11, h: 65 },
    sepia: { l: 0.58, c: 0.09, h: 68 },
  },
  amber: {
    light: { l: 0.58, c: 0.12, h: 90 },
    dark: { l: 0.66, c: 0.12, h: 90 },
    sepia: { l: 0.56, c: 0.1, h: 93 },
  },
  lime: {
    light: { l: 0.62, c: 0.13, h: 110 },
    dark: { l: 0.7, c: 0.13, h: 110 },
    sepia: { l: 0.6, c: 0.11, h: 113 },
  },
  olive: {
    light: { l: 0.52, c: 0.1, h: 125 },
    dark: { l: 0.6, c: 0.1, h: 125 },
    sepia: { l: 0.5, c: 0.08, h: 128 },
  },
  yellowGreen: {
    light: { l: 0.58, c: 0.11, h: 140 },
    dark: { l: 0.66, c: 0.11, h: 140 },
    sepia: { l: 0.56, c: 0.09, h: 142 },
  },
  sage: {
    light: { l: 0.56, c: 0.09, h: 155 },
    dark: { l: 0.64, c: 0.09, h: 155 },
    sepia: { l: 0.54, c: 0.07, h: 157 },
  },
  mintGreen: {
    light: { l: 0.58, c: 0.1, h: 170 },
    dark: { l: 0.66, c: 0.1, h: 170 },
    sepia: { l: 0.56, c: 0.08, h: 172 },
  },
  seafoam: {
    light: { l: 0.54, c: 0.11, h: 185 },
    dark: { l: 0.62, c: 0.11, h: 185 },
    sepia: { l: 0.52, c: 0.09, h: 187 },
  },
  teal: {
    light: { l: 0.56, c: 0.12, h: 200 },
    dark: { l: 0.64, c: 0.12, h: 200 },
    sepia: { l: 0.54, c: 0.1, h: 202 },
  },
  skyBlue: {
    light: { l: 0.58, c: 0.1, h: 225 },
    dark: { l: 0.66, c: 0.1, h: 225 },
    sepia: { l: 0.56, c: 0.08, h: 227 },
  },
  periwinkle: {
    light: { l: 0.6, c: 0.09, h: 250 },
    dark: { l: 0.68, c: 0.09, h: 250 },
    sepia: { l: 0.58, c: 0.07, h: 252 },
  },
  violet: {
    light: { l: 0.58, c: 0.08, h: 270 },
    dark: { l: 0.66, c: 0.08, h: 270 },
    sepia: { l: 0.56, c: 0.06, h: 272 },
  },
} as const;

/**
 * Autumn Sepia Family - Warm nostalgic tones
 * Hue range: 44-68° (orange-brown)
 */
const autumnOKLCH = {
  darkest: { l: 0.2308, c: 0.0327, h: 44.7 }, // #2A1810
  dark: { l: 0.2918, c: 0.0414, h: 45.3 }, // #3D251A
  medium: { l: 0.3839, c: 0.057, h: 49.6 }, // #5C3A27
  light: { l: 0.5335, c: 0.0702, h: 60.0 }, // #8B6342
  lighter: { l: 0.6858, c: 0.0713, h: 67.6 }, // #B8926A
} as const;

/**
 * Autumn Paper - Parchment backgrounds
 * Hue range: 40-74° (warm sepia)
 */
const autumnPaperOKLCH = {
  darkest: { l: 0.2098, c: 0.0176, h: 50.5 }, // #1F1611
  dark: { l: 0.2516, c: 0.0227, h: 51.6 }, // #2B1F18
  mediumDark: { l: 0.2794, c: 0.0233, h: 40.5 }, // #332520
  medium: { l: 0.3183, c: 0.0287, h: 46.4 }, // #3F2E26
  light: { l: 0.9319, c: 0.0301, h: 73.9 }, // #F5E6D3
  lighter: { l: 0.9406, c: 0.0273, h: 72.8 }, // #F7E9D8
  lightest: { l: 0.9602, c: 0.0171, h: 67.6 }, // #FAF0E6
} as const;

/**
 * Autumn Accent - Interactive amber
 * Hue range: 60-62° (rich amber)
 */
const autumnAccentOKLCH = {
  primary: { l: 0.5627, c: 0.1025, h: 61.5 }, // #A0662F
  primaryDark: { l: 0.6652, c: 0.099, h: 60.7 }, // #C08552
} as const;

/**
 * Autumn Semantic Colors
 */
const autumnSemanticOKLCH = {
  error: { l: 0.6019, c: 0.1438, h: 30.2 }, // #C85A4A
  errorDark: { l: 0.69, c: 0.1295, h: 29.5 }, // #E07A6B
  success: { l: 0.6054, c: 0.1085, h: 119.7 }, // #7A8B3A
  successDark: { l: 0.7082, c: 0.1065, h: 117.9 }, // #9BAA5A
  warning: { l: 0.68, c: 0.15, h: 76.5 }, // Slightly darker for consistency with main theme
  warningDark: { l: 0.77, c: 0.14, h: 82.0 }, // Adjusted for sepia mode hierarchy
} as const;

/**
 * Text Hierarchy - Perceptually uniform progressions
 * Dark mode: Even 6% lightness steps with consistent chroma for harmony
 */
const textHierarchyOKLCH = {
  light: {
    subtitle: { l: 0.3767, c: 0.0256, h: 164.7 }, // #35463E (unchanged)
    metadata: { l: 0.5229, c: 0.0276, h: 162.4 }, // #5C6F65 (unchanged)
    secondaryMetadata: { l: 0.6295, c: 0.0309, h: 158.2 }, // #7A8F82 (unchanged)
    caption: { l: 0.5326, c: 0.0284, h: 163.7 }, // #5E7268 - readable content
    subtleLabel: { l: 0.62, c: 0.028, h: 160.0 }, // Subtle labels that should recede
  },
  dark: {
    subtitle: { l: 0.93, c: 0.014, h: 157.0 }, // Premium 2025: slightly more chroma for tint
    metadata: { l: 0.87, c: 0.014, h: 157.0 }, // Premium 2025: -6% L step
    caption: { l: 0.85, c: 0.014, h: 157.0 }, // Readable content (summaries, descriptions)
    subtleLabel: { l: 0.72, c: 0.014, h: 157.0 }, // Subtle labels that should recede
    secondaryMetadata: { l: 0.75, c: 0.014, h: 157.0 }, // Premium 2025: -6% L step, most subtle
  },
  sepia: {
    subtitle: { l: 0.3337, c: 0.0476, h: 51.1 }, // #4A2F1F
    metadata: { l: 0.4287, c: 0.0619, h: 49.4 }, // #6B4530
    secondaryMetadata: { l: 0.5495, c: 0.0624, h: 65.0 }, // #8B6A4A
    caption: { l: 0.4742, c: 0.0668, h: 51.9 }, // #7A5138 - readable content
    subtleLabel: { l: 0.58, c: 0.055, h: 55.0 }, // Subtle labels that should recede
  },
} as const;

// =============================================================================
// CONVERT OKLCH TO HEX (using helper functions for DRY code)
// =============================================================================

const forest = convertFlatPalette(forestOKLCH);
const sage = convertFlatPalette(sageOKLCH);
const tint = convertFlatPalette(tintOKLCH);
const disabled = convertFlatPalette(disabledOKLCH);
const semantic = convertFlatPalette(semanticOKLCH);
const azure = convertFlatPalette(azureOKLCH);
const violet = convertFlatPalette(violetOKLCH);
const indigo = convertFlatPalette(indigoOKLCH);
const coral = convertFlatPalette(coralOKLCH);
const sepiaPure = convertFlatPalette(sepiaPureOKLCH);

const pure = {
  ...convertFlatPalette(pureOKLCH),
  transparent: 'transparent',
} as const;

const grammar = convertThemedPalette(grammarOKLCH);

const autumn = {
  ...convertFlatPalette(autumnOKLCH),
  paper: convertFlatPalette(autumnPaperOKLCH),
  accent: convertFlatPalette(autumnAccentOKLCH),
  semantic: convertFlatPalette(autumnSemanticOKLCH),
} as const;

const textHierarchy = convertTextHierarchyPalette(textHierarchyOKLCH);

// =============================================================================
// BASE PALETTE - Public API
// =============================================================================

const basePalette = {
  forest,
  sage,
  tint,
  disabled,
  semantic,
  azure,
  violet,
  indigo,
  coral,
  pure,
  autumn,
  sepiaPure,
  grammar,
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
// GRAMMAR COLORS FACTORY
// =============================================================================

/**
 * Factory function to create grammar color palette for any theme variant.
 * Single source of truth for grammar role → color mapping.
 *
 * Frequency-based assignment with maximum hue separation for roles that appear together:
 *   - preposition: amber (90°) - High frequency (15 uses)
 *   - possessive: sage (155°) - High frequency (13 uses) - 65° from prep
 *   - particle: lime (110°) - Medium-high frequency (9 uses) - 20° from prep
 *   - interrogative: seafoam (185°) - Medium frequency (8 uses) - 75° from particle
 *   - verbConjugation: mintGreen (170°) - Medium frequency (5 uses)
 *   - negation: olive (125°) - Medium frequency (5 uses)
 *   - subjectPrefix: skyBlue (225°) - Low frequency (4 uses) - 135° from amber
 *   - plural: yellowGreen (140°) - Low frequency (4 uses)
 *   - demonstrative: teal (200°) - Low frequency (4 uses)
 *   - conjunction: periwinkle (250°) - Low frequency (4 uses) - 25° from subjectPrefix
 *   - futureTense: violet (270°) - Very low frequency (2 uses)
 *   - definiteArticle: golden (65°) - Rare (1 use) - 25° from prep
 */
const createGrammarColors = (variant: 'light' | 'dark' | 'sepia') => ({
  preposition: basePalette.grammar.amber[variant],
  possessive: basePalette.grammar.sage[variant],
  particle: basePalette.grammar.lime[variant],
  interrogative: basePalette.grammar.seafoam[variant],
  verbConjugation: basePalette.grammar.mintGreen[variant],
  negation: basePalette.grammar.olive[variant],
  subjectPrefix: basePalette.grammar.skyBlue[variant],
  plural: basePalette.grammar.yellowGreen[variant],
  demonstrative: basePalette.grammar.teal[variant],
  conjunction: basePalette.grammar.periwinkle[variant],
  futureTense: basePalette.grammar.violet[variant],
  definiteArticle: basePalette.grammar.golden[variant],
});

// =============================================================================
// THEME COLOR DEFINITIONS (Unchanged structure from original)
// =============================================================================

const lightColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.forest.dark,
  secondary: basePalette.forest.medium, // Distinct from primary for visual hierarchy
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
  info: basePalette.azure.light, // Blue for stable/good state - distinct from Mastered green
  accent: basePalette.indigo.light, // Distinct from info - used for interactive accents (e.g., diacritics)
  violet: basePalette.violet.light,
  indigo: basePalette.indigo.light,
  coral: basePalette.coral.light, // Reserved for future grammar concepts

  // Text hierarchy
  englishText: basePalette.forest.medium,
  arabicText: basePalette.forest.darkest,
  authorText: textHierarchy.light.subtitle,
  headingText: basePalette.forest.darkest,
  subtitleText: textHierarchy.light.subtitle,
  metadataText: textHierarchy.light.metadata,
  secondaryMetadataText: textHierarchy.light.secondaryMetadata,
  captionText: textHierarchy.light.caption,
  subtleLabelText: textHierarchy.light.subtleLabel,

  // Interactive elements
  tint: basePalette.tint.primary,
  tintBackground: withAlpha(basePalette.tint.primary, opacity.medium),
  tabIconDefault: basePalette.forest.lighter,
  tabIconSelected: basePalette.tint.primary,
  icon: basePalette.forest.light,
  disabled: basePalette.disabled.universal,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: withAlpha(basePalette.sage.lighter, opacity.modal),
  modalOverlay: withAlpha(basePalette.sage.lighter, opacity.full),
  borderOverlay: withAlpha(basePalette.tint.primary, opacity.border),
  buttonOverlay: withAlpha(basePalette.tint.primary, opacity.medium),
  backdropOverlay: withAlpha(basePalette.forest.dark, opacity.backdrop),

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
  wordTooltipShadow: withAlpha(basePalette.forest.dark, opacity.active),

  // Navigation
  navigationRipple: withAlpha(basePalette.tint.primary, opacity.strong),
  headerOverlay: withAlpha(basePalette.sage.lighter, opacity.header),
  tabBarOverlay: withAlpha(basePalette.sage.lighter, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primary,
  progressBackground: withAlpha(basePalette.tint.primary, opacity.border),
  readingProgressIndicator: basePalette.forest.lighter,
  readingProgressBackground: withAlpha(basePalette.forest.lighter, opacity.border),
  interactiveSecondary: basePalette.forest.light,
  completionSuccess: basePalette.semantic.success,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.grid,
  chartThreshold: basePalette.charts.ui.threshold,

  // Card gradients - pre-computed for performance (dark gradient for text readability on images)
  cardGradient: [
    withAlpha(basePalette.sage.darkest, 0),
    withAlpha(basePalette.sage.darkest, opacity.medium),
    withAlpha(basePalette.sage.darkest, opacity.modal),
    basePalette.sage.dark,
  ] as const,

  // Card overlay text colors (always light for readability on gradient)
  cardOverlayHeading: basePalette.pure.white,
  cardOverlayAuthor: withAlpha(basePalette.pure.white, opacity.shadow),

  // Utility colors
  textOverlay: withAlpha(basePalette.tint.primary, opacity.subtle),
  textShadowDark: withAlpha(basePalette.forest.dark, opacity.shadow),
  textShadowLight: withAlpha(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.lighter,
  white: basePalette.pure.white,
  black: basePalette.pure.black,

  // Grammar color palette - see createGrammarColors() for role/color documentation
  grammar: createGrammarColors('light'),
} as const;

const darkColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.tint.primaryDark,
  secondary: basePalette.forest.light, // Lower L = less contrast on dark bg = correctly less prominent
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
  info: basePalette.azure.dark, // Blue for stable/good state - distinct from Mastered green (dark mode)
  accent: basePalette.indigo.dark, // Distinct from info - used for interactive accents (e.g., diacritics)
  violet: basePalette.violet.dark,
  indigo: basePalette.indigo.dark,
  coral: basePalette.coral.dark, // Reserved for future grammar concepts

  // Text hierarchy
  englishText: textHierarchy.dark.subtitle,
  arabicText: basePalette.pure.white,
  authorText: textHierarchy.dark.metadata,
  headingText: basePalette.pure.white,
  subtitleText: textHierarchy.dark.subtitle,
  metadataText: textHierarchy.dark.metadata,
  secondaryMetadataText: textHierarchy.dark.secondaryMetadata,
  captionText: textHierarchy.dark.caption,
  subtleLabelText: textHierarchy.dark.subtleLabel,

  // Interactive elements
  tint: basePalette.tint.primaryDark,
  tintBackground: withAlpha(basePalette.tint.primaryDark, opacity.medium),
  tabIconDefault: basePalette.forest.light, // Increased from forest.medium for better dark mode visibility
  tabIconSelected: basePalette.tint.primaryDark,
  icon: basePalette.forest.lighter, // Palette-based for consistency (matches light/sepia pattern)
  disabled: basePalette.disabled.universal,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: withAlpha(basePalette.sage.darkest, opacity.modal),
  modalOverlay: withAlpha(basePalette.sage.darkest, opacity.full),
  borderOverlay: withAlpha(basePalette.tint.primaryDark, opacity.border),
  buttonOverlay: withAlpha(basePalette.tint.primaryDark, opacity.medium),
  backdropOverlay: withAlpha(basePalette.sage.darkest, opacity.darkBackdrop),

  // Elevation system
  shadow: basePalette.pure.black,
  elevation0: elevation.dark.level0,
  elevation1: elevation.dark.level1,
  elevation2: elevation.dark.level2,
  elevation3: elevation.dark.level3,

  // Reading experience
  wordTooltipBg: basePalette.sage.medium,
  wordTooltipText: basePalette.pure.white,
  wordTooltipBorder: basePalette.forest.light, // Premium 2025: subtle brighter border (L: 0.576 vs bg L: 0.265)
  wordTooltipShadow: withAlpha(basePalette.pure.black, opacity.active),

  // Navigation
  navigationRipple: withAlpha(basePalette.tint.primaryDark, opacity.active),
  headerOverlay: withAlpha(basePalette.sage.darkest, opacity.header),
  tabBarOverlay: withAlpha(basePalette.sage.darkest, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.tint.primaryDark,
  progressBackground: withAlpha(basePalette.tint.primaryDark, opacity.border),
  readingProgressIndicator: basePalette.sage.medium,
  readingProgressBackground: withAlpha(basePalette.sage.medium, opacity.border),
  interactiveSecondary: textHierarchy.dark.metadata,
  completionSuccess: basePalette.semantic.successDark,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.gridDark,
  chartThreshold: basePalette.charts.ui.thresholdDark,

  // Card gradients - pre-computed for performance
  cardGradient: [
    withAlpha(basePalette.sage.darkest, 0),
    withAlpha(basePalette.sage.darkest, opacity.medium),
    withAlpha(basePalette.sage.darkest, opacity.modal),
    basePalette.sage.dark,
  ] as const,

  // Card overlay text colors (always light for readability on gradient)
  cardOverlayHeading: basePalette.pure.white,
  cardOverlayAuthor: withAlpha(basePalette.pure.white, opacity.shadow),

  // Utility colors
  textOverlay: withAlpha(basePalette.tint.primaryDark, opacity.subtle),
  textShadowDark: withAlpha(basePalette.pure.black, opacity.shadow),
  textShadowLight: withAlpha(basePalette.pure.white, opacity.shadow),
  modalIndicator: basePalette.forest.light,
  white: basePalette.pure.white,
  black: basePalette.pure.black,

  // Grammar color palette - see createGrammarColors() for role/color documentation
  grammar: createGrammarColors('dark'),
} as const;

const sepiaColors: ThemeColors = {
  // Core brand colors
  primary: basePalette.autumn.dark,
  secondary: basePalette.autumn.medium,
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
  info: basePalette.azure.sepia, // Blue-gray for stable/good state - distinct from Mastered (sepia mode)
  accent: basePalette.indigo.sepia, // Distinct from info - used for interactive accents (e.g., diacritics)
  violet: basePalette.violet.sepia,
  indigo: basePalette.indigo.sepia,
  coral: basePalette.coral.sepia, // Reserved for future grammar concepts

  // Text hierarchy
  englishText: basePalette.autumn.medium,
  arabicText: basePalette.autumn.darkest,
  authorText: textHierarchy.sepia.subtitle,
  headingText: basePalette.autumn.darkest,
  subtitleText: textHierarchy.sepia.subtitle,
  metadataText: textHierarchy.sepia.metadata,
  secondaryMetadataText: textHierarchy.sepia.secondaryMetadata,
  captionText: textHierarchy.sepia.caption,
  subtleLabelText: textHierarchy.sepia.subtleLabel,

  // Interactive elements
  tint: basePalette.autumn.accent.primary,
  tintBackground: withAlpha(basePalette.autumn.accent.primary, opacity.medium),
  tabIconDefault: basePalette.autumn.lighter,
  tabIconSelected: basePalette.autumn.accent.primary,
  icon: basePalette.autumn.light,
  disabled: basePalette.disabled.universal,

  // Overlays
  transparent: basePalette.pure.transparent,
  overlay: withAlpha(basePalette.autumn.paper.lighter, opacity.modal),
  modalOverlay: withAlpha(basePalette.autumn.paper.lighter, opacity.full),
  borderOverlay: withAlpha(basePalette.autumn.accent.primary, opacity.border),
  buttonOverlay: withAlpha(basePalette.autumn.accent.primary, opacity.medium),
  backdropOverlay: withAlpha(basePalette.autumn.dark, opacity.backdrop),

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
  wordTooltipShadow: withAlpha(basePalette.autumn.dark, opacity.active),

  // Navigation
  navigationRipple: withAlpha(basePalette.autumn.accent.primary, opacity.strong),
  headerOverlay: withAlpha(basePalette.autumn.paper.lighter, opacity.header),
  tabBarOverlay: withAlpha(basePalette.autumn.paper.lighter, opacity.modal),

  // UI semantics
  progressIndicator: basePalette.autumn.accent.primary,
  progressBackground: withAlpha(basePalette.autumn.accent.primary, opacity.border),
  readingProgressIndicator: basePalette.autumn.lighter,
  readingProgressBackground: withAlpha(basePalette.autumn.lighter, opacity.border),
  interactiveSecondary: basePalette.autumn.light,
  completionSuccess: basePalette.autumn.semantic.success,

  // Chart UI colors
  chartGrid: basePalette.charts.ui.gridSepia,
  chartThreshold: basePalette.charts.ui.thresholdSepia,

  // Card gradients - pre-computed for performance (dark gradient for text readability on images)
  cardGradient: [
    withAlpha(basePalette.autumn.darkest, 0),
    withAlpha(basePalette.autumn.darkest, opacity.medium),
    withAlpha(basePalette.autumn.darkest, opacity.modal),
    basePalette.autumn.dark,
  ] as const,

  // Card overlay text colors (always light for readability on gradient)
  cardOverlayHeading: basePalette.sepiaPure.white,
  cardOverlayAuthor: withAlpha(basePalette.sepiaPure.white, opacity.shadow),

  // Utility colors
  textOverlay: withAlpha(basePalette.autumn.accent.primary, opacity.subtle),
  textShadowDark: withAlpha(basePalette.autumn.dark, opacity.shadow),
  textShadowLight: withAlpha(basePalette.sepiaPure.white, opacity.shadow),
  modalIndicator: basePalette.autumn.lighter,
  white: basePalette.sepiaPure.white,
  black: basePalette.sepiaPure.black,

  // Grammar color palette - see createGrammarColors() for role/color documentation
  grammar: createGrammarColors('sepia'),
} as const;

/**
 * Hex opacity suffixes for use with color strings
 * Example: `${colors.tint}${OPACITY_HEX.HIGH}` → "#5B7F68CC"
 */
export const OPACITY_HEX = {
  FULL: 'FF', // 100%
  HIGH: 'CC', // 80%
  MEDIUM_HIGH: 'B3', // 70%
  MEDIUM: '99', // 60%
  MEDIUM_LOW: '66', // 40%
  LOW: '26', // 15%
  SUBTLE: '14', // 8%
  FAINT: '0D', // 5%
} as const;

export const Colors = { light: lightColors, dark: darkColors, sepia: sepiaColors } as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Sepia = 'sepia',
}

export type ColorName = keyof ThemeColors;
