import type { TextStyle } from 'react-native';
import { Dimensions } from 'react-native';

import { FONTS } from '@/constants/fonts';

// Removed platform-specific constants - using unified values for simplicity

// For mobile-only apps, screen width doesn't change during runtime
// Use static width instead of dynamic useWindowDimensions
const SCREEN_DIMENSIONS = Dimensions.get('window');
export const SCREEN_WIDTH = SCREEN_DIMENSIONS?.width ?? 375; // Default fallback for test environments

// Base scale for systematic sizing
const BASE_UNIT = 4;

// Golden ratio for aesthetically pleasing proportions (φ = 1.618)
export const GOLDEN_RATIO = 1.618;

// Systematic spacing scale based on base unit
const SPACING_SCALE = {
  MICRO: BASE_UNIT * 0.25, // 1
  HALF_TINY: BASE_UNIT * 0.5, // 2 - for fractional needs
  TINY: BASE_UNIT, // 4
  SMALL: BASE_UNIT * 2, // 8
  MEDIUM: BASE_UNIT * 3, // 12
  LARGE: BASE_UNIT * 4, // 16
  XLARGE: BASE_UNIT * 6, // 24
  XXLARGE: BASE_UNIT * 8, // 32
  HUGE: BASE_UNIT * 10, // 40 - fills gap between XXLARGE and XXXLARGE
  XXXLARGE: BASE_UNIT * 12, // 48
} as const;

// Touch target system
const TOUCH_TARGETS = {
  SMALL: BASE_UNIT * 8, // 32 - responsive to base unit
  MEDIUM: BASE_UNIT * 11, // 44 - responsive to base unit
  LARGE: BASE_UNIT * 12, // 48 - iOS/Android minimum recommended, responsive
  ICON_PADDING: BASE_UNIT * 3, // 12
} as const;

/**
 * Unified shadow/elevation system - uses iOS-style shadows on both platforms.
 * Creates shadow configuration object (shadowColor applied at usage site).
 */
const createShadow = (elevation: number, opacity: number, radius: number) => ({
  shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
  shadowOpacity: opacity,
  shadowRadius: radius,
});

/** Creates symmetric hit slop for touch targets */
const createHitSlop = (size: number) => ({ top: size, bottom: size, left: size, right: size });

const ELEVATION_RAW = {
  NONE: createShadow(0, 0, 0),
  SUBTLE: createShadow(2, 0.12, 3),
  SMALL: createShadow(4, 0.16, 6),
  MEDIUM: createShadow(6, 0.2, 8),
  LARGE: createShadow(10, 0.25, 12),
} as const;

/**
 * Elevation system — exposes both magnitude tiers (NONE/SUBTLE/SMALL/MEDIUM/LARGE)
 * and semantic role aliases. Prefer the role aliases in new code so visual hierarchy
 * is driven by intent, not by guessing a magnitude. Magnitude tiers stay for cases
 * where the role doesn't fit cleanly.
 *
 *   HAIRLINE — flush surfaces (separators, inline chips)             → SUBTLE
 *   CARD     — content cards in normal flow                          → SMALL
 *   FLOATING — FABs, MiniPlayer, floating overlays                   → MEDIUM
 *   MODAL    — sheets, popovers, tooltips that sit above the surface → LARGE
 */
const ELEVATION_SYSTEM = {
  ...ELEVATION_RAW,
  HAIRLINE: ELEVATION_RAW.SUBTLE,
  CARD: ELEVATION_RAW.SMALL,
  FLOATING: ELEVATION_RAW.MEDIUM,
  MODAL: ELEVATION_RAW.LARGE,
} as const;

const TYPOGRAPHY_HIERARCHY = {
  WEIGHTS: {
    REGULAR: '400' as const,
    MEDIUM: '500' as const,
    SEMIBOLD: '600' as const,
    BOLD: '700' as const,
    HEAVY: '800' as const,
  },

  COLOR_HIERARCHY: {
    PRIMARY: 1.0,
    SECONDARY: 0.85,
    TERTIARY: 0.65,
    SUBTLE: 0.5,
    ACCENT: 0.75,
  },

  LETTER_SPACING: {
    EXTRA_TIGHT: -0.5,
    TIGHT: -0.3,
    NARROW: -0.2,
    SLIGHT_NEGATIVE: -0.1,
    NORMAL: 0,
    SLIGHT_POSITIVE: 0.1,
    WIDE: 0.2,
    RELAXED: 0.3,
    EXTRA_WIDE: 0.4,
    ULTRA_WIDE: 0.5,
  },

  LINE_HEIGHT_MULTIPLIERS: {
    TIGHT: 1.2,
    NORMAL: 1.4,
    LOOSE: 1.6,
    ARABIC: 2.2, // Standard Arabic line height multiplier
  },

  MICRO_ADJUSTMENTS: {
    CONTENT_TYPES: {
      CARD_TITLE: {
        letterSpacing: -0.15,
        lineHeightMultiplier: 1.2,
      },
      SECTION_HEADER: {
        letterSpacing: -0.35,
        lineHeightMultiplier: 1.1,
      },
      AUTHOR_BYLINE: {
        letterSpacing: 0.15,
        lineHeightMultiplier: 1.25,
      },
    },
  },

  OPACITY_BOOST: {
    LIGHT_THEME: 0.05,
    DARK_THEME: 0.08,
  },
} as const;

// ===== FLAT EXPORTS FOR SIMPLIFIED IMPORTS =====
// These are top-level exports of TYPOGRAPHY_HIERARCHY for cleaner imports

/** Line height multiplier constants */
export const LINE_HEIGHT_MULTIPLIERS = TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS;

/** Letter spacing constants */
export const LETTER_SPACING = TYPOGRAPHY_HIERARCHY.LETTER_SPACING;

/** Text opacity values for hierarchy */
export const TEXT_OPACITY = TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY;

/** Pre-computed text style configurations for content types */
export const TEXT_STYLES = TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES;

// Dynamic word area height based on screen proportions and touch targets

// Export touch targets for external use
export const MIN_TOUCH_TARGET = TOUCH_TARGETS;

// Status indicator constants for consistent visual feedback
export const STATUS_INDICATOR = {
  DOT_SIZE: 6, // Small status dots used in cards and headers
  DOT_RADIUS: 3, // Perfect circle radius for 6px dots
} as const;

/**
 * Progress threshold for considering an article completed (90%)
 * Articles above this threshold are treated as finished and excluded from "Continue Reading"
 */
export const COMPLETION_THRESHOLD = 90;

export const LAYOUT = {
  /** Left/right screen edge padding for all content (12px) */
  SCREEN_HORIZONTAL_PADDING: SPACING_SCALE.MEDIUM,

  SPACING: SPACING_SCALE,

  /**
   * Standardized opacity values for consistent visual appearance
   * Comprehensive scale from very subtle to full opacity
   */
  OPACITY: {
    FAINT: 0.15, // Very subtle elements (chart cursors, hints)
    LIGHT: 0.25, // Dividers, subtle separators
    SUBTLE: 0.3, // Secondary elements, disabled states
    OVERLAY: 0.4, // Modal overlays, backgrounds
    MEDIUM: 0.5, // Mid-level visibility
    PRESSED: 0.6, // Button pressed state
    HIGH: 0.7, // Primary visibility
    ACTIVE: 0.75, // Active button state
    HOVER: 0.8, // Hover state
    FULL: 1.0, // Complete opacity
  },

  BOTTOM_BAR: {
    HEIGHT: 50, // Native tab bar height (Expo Router default) - SafeAreaInsets handles device-specific spacing
  },

  BORDER_RADIUS: {
    NONE: 0, // No border radius
    MICRO: 2, // For chart dots and small elements
    TINY: 3, // Perfect circles for 6px elements (STATUS_INDICATOR dots)
    SMALL_CIRCLE: 6, // Small rounded elements
    SMALL: BASE_UNIT * 2.5, // 10 - softer corners (2025 trend)
    MEDIUM: SPACING_SCALE.LARGE, // 16 - softer corners (2025 trend)
    LARGE: BASE_UNIT * 5, // 20 - for larger cards/containers (2025 trend)
    PILL: 9999, // Keep as is for perfect circles
  },

  CARD: {
    HEIGHT: {
      // Dynamic heights based on content
      LIST_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // 48 + 32 = 80
      AUDIO_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.XLARGE * 2, // 48 + 40 = 88
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.XXLARGE * 2, // 48 + 64 = 112 (taller for 2-line title)
      VOCABULARY_ITEM: TOUCH_TARGETS.MEDIUM + SPACING_SCALE.MEDIUM, // 44 + 12 = 56 (compact hairline dictionary row)
    },
    IMAGE: {
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.SMALL, // 48 + 8 = 56 (increased from 40 for better balance)
      MINI_PLAYER_ARTWORK: BASE_UNIT * 14, // 56 - MiniPlayer album artwork (modern compact thumb)
      THUMBNAIL: {
        WIDTH: BASE_UNIT * 20, // 80 - bookmark/list thumbnails (2025: larger for visual prominence)
        HEIGHT: BASE_UNIT * 15, // 60 - 4:3 aspect ratio
      },
    },
  },

  INPUT: {
    HEIGHT: TOUCH_TARGETS.LARGE + BASE_UNIT, // 52 - responsive to touch targets + padding
    MULTILINE_HEIGHT: BASE_UNIT * 50, // 200 - standard height for multiline text areas
    BORDER_WIDTH: {
      DEFAULT: Math.round(BASE_UNIT * 0.375), // 1.5 rounded to 2 - prevents sub-pixel rendering
      FOCUSED: BASE_UNIT * 0.5, // 2 - responsive to base unit
    },
  },

  BUTTON: {
    HEIGHT: {
      SMALL: TOUCH_TARGETS.SMALL, // 32 - responsive to touch targets
      MEDIUM: TOUCH_TARGETS.MEDIUM, // 44 - responsive to touch targets
      LARGE: TOUCH_TARGETS.LARGE, // 48 - responsive to touch targets
      FAB: BASE_UNIT * 14, // 56 - Material 3 FAB size
    },
    ICON_SIZE: {
      SMALL: SPACING_SCALE.LARGE, // 16 - responsive to spacing scale
      MEDIUM: BASE_UNIT * 5, // 20 - responsive to base unit
      LARGE: SPACING_SCALE.XLARGE, // 24 - responsive to spacing scale
      XLARGE: BASE_UNIT * 7, // 28 - responsive to base unit
      XXLARGE: BASE_UNIT * 16, // 64 - responsive to base unit (for empty states)
      HERO: BASE_UNIT * 24, // 96 - large icons for empty states and illustrations
    },
  },

  TYPOGRAPHY: {
    SCALE: {
      TINY: BASE_UNIT * 2.75, // 11 - responsive to base unit
      SMALL: BASE_UNIT * 3.25, // 13 - responsive to base unit
      MEDIUM: BASE_UNIT * 4, // 16 - Material Design minimum (improved from 15px)
      LARGE: BASE_UNIT * 4.5, // 18 - clear heading3/body distinction (1.125x ratio)
      XLARGE: BASE_UNIT * 5.5, // 22 - bolder heading (2025 trend)
      XXLARGE: BASE_UNIT * 6, // 24 - bolder heading (2025 trend)
      HUGE: BASE_UNIT * 8, // 32 - bolder heading (2025 trend)
      DEFAULT_ARABIC: BASE_UNIT * 8, // 32 - alias for HUGE, used for Arabic text settings
      XXHUGE: BASE_UNIT * 9.5, // 38 - bolder heading (2025 trend)
      MASSIVE: BASE_UNIT * 11, // 44 - bolder heading (2025 trend)
    },
    LINE_HEIGHT: TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS,
  },

  ELEVATION: ELEVATION_SYSTEM,

  Z_INDEX: {
    BASE: 0,
    CARD: 1,
    HEADER: 2,
    MODAL: 3,
    OVERLAY: 4,
    TOOLTIP: 5,
    POPUP: 6,
    TOP_OVERLAY: 9999, // Maximum z-index for critical overlays that must be above everything
  },

  /** 3D transform focal length (px) for perspective transforms (e.g. card flip) */
  PERSPECTIVE: {
    CARD: 1000, // Review flip card front/back rotateY depth
  },

  CHART: {
    Y_AXIS_WIDTH: BASE_UNIT * 8, // 32 - adjusted for "100%" label visibility
    CURSOR_WIDTH: 1, // Chart interaction cursor width — hairline, visibility comes from opacity
    BADGE_PADDING: SPACING_SCALE.SMALL, // 8 - Chart badge padding
    BADGE_DOT_MARGIN: BASE_UNIT * 1.5, // 6 - Margin for badge dots
    HEIGHT: BASE_UNIT * 15, // 60 - Standard chart height for streak visualization
    BAR_GAP: BASE_UNIT * 0.5, // 2 - Space between bars in charts
  },

  /** Brand assets standardized dimensions */
  BRAND: {
    LOGO_WIDTH: BASE_UNIT * 20, // 80 - Standard logo width
    LOGO_HEIGHT: BASE_UNIT * 10, // 40 - Standard logo height (2:1 ratio)
  },

  /** Standard height for thin progress bars */
  PROGRESS_BAR: {
    HEIGHT: BASE_UNIT, // 4 - responsive to base unit (changed from 0.75 to avoid fractional pixels)
  },

  /** Common sizes for bottom sheet UI elements */
  BOTTOM_SHEET: {
    HEADER: {
      paddingHorizontal: SPACING_SCALE.MEDIUM, // 12 - consistent with practice bottom sheets
      paddingBottom: SPACING_SCALE.TINY, // 4 - consistent with practice bottom sheets
      marginBottom: SPACING_SCALE.TINY, // 4 - consistent with practice bottom sheets
      alignItems: 'center' as const, // Center the title
    },
    STYLES: {
      bottomSheet: {
        borderTopLeftRadius: BASE_UNIT * 5, // 20 - softer corners (2025 trend)
        borderTopRightRadius: BASE_UNIT * 5, // 20 - softer corners (2025 trend)
      },
      indicator: {
        width: BASE_UNIT * 9, // 36 - consistent indicator width
        height: BASE_UNIT, // 4 - consistent indicator height
      },
      // Shared text styles for bottom sheet headers (DRY)
      title: {
        marginBottom: SPACING_SCALE.TINY, // 4px - tight coupling with subtitle
        textAlign: 'center' as const,
      },
      subtitle: {
        textAlign: 'center' as const, // Typography from ThemedText type="body"
      },
    },
  },

  REVIEW: {
    BOTTOM_ACTIONS_HEIGHT: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // Same as CARD.HEIGHT.LIST_ITEM
    INDICATOR_MAX_WIDTH: BASE_UNIT * 22.5, // 90 - responsive to base unit
    COMPLETION: {
      ICON_DEFAULT_SIZE: BASE_UNIT * 25, // 100 - responsive to base unit
      ICON_CONTAINER_HEIGHT: BASE_UNIT * 30, // 120 - responsive to base unit
      CONTENT_MAX_WIDTH: BASE_UNIT * 87.5, // 350 - responsive to base unit
    },
  },

  HIT_SLOP: {
    SMALL: createHitSlop(SPACING_SCALE.SMALL), // 8
    MEDIUM: createHitSlop(SPACING_SCALE.MEDIUM), // 12
    LARGE: createHitSlop(SPACING_SCALE.LARGE), // 16
  },

  BORDER: {
    WIDTH: {
      NONE: 0,
      THIN: Math.round(BASE_UNIT * 0.125), // 0.5 rounded to 1 - prevents sub-pixel rendering
      NORMAL: BASE_UNIT * 0.25, // 1 - responsive to base unit
      FOCUSED: BASE_UNIT * 0.5, // 2 - responsive to base unit
    },
  },

  /**
   * Common styles used across tab screens to reduce duplication
   * Centralizes frequently repeated style patterns
   */
  COMMON_STYLES: {
    CONTAINER: {
      flex: 1,
    },
    CONTENT_CONTAINER: {
      paddingHorizontal: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
    },
  },

  /**
   * Standardized screen padding utilities for consistent spacing
   * Tab bar now handles its own safe area, so screens just need simple padding
   */
  SCREEN_PADDING: {
    /**
     * Standard bottom padding for tab screens
     * Tab bar auto-adjusts for safe area, so just add small buffer
     */
    bottomDefault: SPACING_SCALE.SMALL, // 8px buffer above tab bar
  },

  /** Text shadow settings for overlaid text (e.g., article titles on images) */
  TEXT_SHADOW: {
    offset: { width: 0, height: 1 },
    radius: 2,
  },

  /** Blur effect configuration for translucent surfaces */
  BLUR: {
    TAB_BAR: {
      intensity: 80,
      tint: { light: 'light', dark: 'dark', sepia: 'light' },
    },
    BACKDROP: {
      intensity: 30,
      tint: { light: 'light', dark: 'dark', sepia: 'light' },
    },
  },

  /** Android Material Design 3 touch targets */
  ANDROID: {
    TOUCH_TARGET: {
      MIN_SIZE: 48, // MD3 minimum touch target
      PREFERRED_SIZE: 56, // MD3 preferred touch target
      RIPPLE_RADIUS: 20, // For ripple effects
    },
  },
};

export const getArabicTextStyle = (
  fontSize: number,
  additionalStyles: TextStyle = {},
  fontFamily: string = FONTS.ARABIC,
): TextStyle => {
  return {
    fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.ARABIC),
    writingDirection: 'rtl',
    textAlign: 'right',
    includeFontPadding: false,
    paddingVertical: SPACING_SCALE.TINY * 1.5,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    ...additionalStyles,
  };
};

/**
 * Arabic sized for a dense index row (the dictionary list).
 *
 * Reading surfaces keep `getArabicTextStyle`: its 2.2x line height and 6px of
 * diacritic headroom are what make body Arabic legible, but they also make a
 * single-line row ~82px tall before any padding. An index row is a navigation
 * surface, so it caps the user's reading size and drops to the LOOSE multiplier.
 */
export const getCompactArabicTextStyle = (
  fontSize: number,
  fontFamily: string = FONTS.ARABIC,
): TextStyle => {
  const size = Math.min(fontSize, LAYOUT.TYPOGRAPHY.SCALE.XLARGE);
  return {
    ...getArabicTextStyle(size, {}, fontFamily),
    lineHeight: Math.round(size * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE),
    paddingVertical: SPACING_SCALE.HALF_TINY,
  };
};

export const getEnhancedOpacity = (
  baseOpacity: number,
  isDarkMode: boolean = false,
  isInteractive: boolean = false,
): number => {
  let adjustedOpacity = baseOpacity;

  if (isDarkMode) {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.OPACITY_BOOST.DARK_THEME;
  } else {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.OPACITY_BOOST.LIGHT_THEME;
  }

  if (isInteractive) {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.OPACITY_BOOST.LIGHT_THEME; // 0.05
  }

  return Math.min(1.0, Math.max(0.0, adjustedOpacity));
};

/**
 * 2025 Dark Mode Elevation Pattern
 *
 * Modern dark mode design relies on elevation background colors for hierarchy.
 * Shadows are nearly invisible on dark backgrounds, so we remove them entirely.
 * The perceptually uniform 4.5% lightness steps between elevation levels
 * provide sufficient visual separation without borders or shadows.
 */

/**
 * Returns theme-aware elevation styles that remove shadows in dark mode.
 * Accepts both magnitude tiers (SUBTLE/SMALL/MEDIUM/LARGE) and semantic
 * role aliases (HAIRLINE/CARD/FLOATING/MODAL).
 */
export type ElevationLevel = Exclude<keyof typeof ELEVATION_SYSTEM, 'NONE'>;

export const getThemeAwareElevation = (level: ElevationLevel, isDarkMode: boolean) => ({
  ...ELEVATION_SYSTEM[level],
  shadowOpacity: isDarkMode ? 0 : ELEVATION_SYSTEM[level].shadowOpacity,
});
