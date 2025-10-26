import type { TextStyle } from 'react-native';
import { Dimensions } from 'react-native';

// Removed platform-specific constants - using unified values for simplicity

// For mobile-only apps, screen width doesn't change during runtime
// Use static width instead of dynamic useWindowDimensions
const SCREEN_DIMENSIONS = Dimensions.get('window');
export const SCREEN_WIDTH = SCREEN_DIMENSIONS?.width ?? 375; // Default fallback for test environments

export const FONTS = {
  ENGLISH: 'Inter',
  ARABIC: 'NotoSansArabic-Regular', // Default Arabic font
} as const;

// Base scale for systematic sizing
const BASE_UNIT = 4;

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
  XXXLARGE: BASE_UNIT * 12, // 48
} as const;

// Touch target system
const TOUCH_TARGETS = {
  SMALL: BASE_UNIT * 8, // 32 - responsive to base unit
  MEDIUM: BASE_UNIT * 11, // 44 - responsive to base unit
  LARGE: BASE_UNIT * 12, // 48 - iOS/Android minimum recommended, responsive
  ICON_PADDING: BASE_UNIT * 3, // 12
} as const;

// Unified shadow/elevation system - uses iOS-style shadows on both platforms
const createShadow = (elevation: number, opacity: number, radius: number) => ({
  shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowColor: '#000', // Explicit shadow color for consistency
});

const createElevation = (level: number, opacity: number, radius: number) => ({
  ...createShadow(level, opacity, radius),
});

const ELEVATION_SYSTEM = {
  NONE: createElevation(0, 0, 0),
  SUBTLE: createElevation(2, 0.12, 3),
  SMALL: createElevation(4, 0.16, 6),
  MEDIUM: createElevation(6, 0.2, 8),
  LARGE: createElevation(10, 0.25, 12),
} as const;

export const TYPOGRAPHY_HIERARCHY = {
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
    ARABIC: 2.2, // Moved from LAYOUT.TYPOGRAPHY for consistency
  },

  SEMANTIC_COLORS: {
    PRIMARY_CONTENT: 'text',
    SECONDARY_CONTENT: 'secondaryText',
    TERTIARY_CONTENT: 'textTertiary',
    ACCENT_CONTENT: 'tint',
    AUTHOR_CONTENT: 'authorText',
    ENGLISH_CONTENT: 'englishText',
    ARABIC_CONTENT: 'arabicText',
    SUCCESS_CONTENT: 'success',
    WARNING_CONTENT: 'warning',
    INFO_CONTENT: 'info',
    HEADING_CONTENT: 'headingText',
    SUBTITLE_CONTENT: 'subtitleText',
    METADATA_CONTENT: 'metadataText',
    CAPTION_CONTENT: 'captionText',
  } as const,

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
      METADATA: {
        letterSpacing: 0.3,
        lineHeightMultiplier: 1.3,
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

// Dynamic word area height based on screen proportions and touch targets
export const WORD_AREA_MIN_HEIGHT = TOUCH_TARGETS.LARGE * 7.5; // ~360px, responsive to touch targets

// Export touch targets for external use
export const MIN_TOUCH_TARGET = TOUCH_TARGETS;

// Status indicator constants for consistent visual feedback
export const STATUS_INDICATOR = {
  DOT_SIZE: 6, // Small status dots used in cards and headers
  DOT_RADIUS: 3, // Perfect circle radius for 6px dots
} as const;

// Icon container constants for consistent sizing
export const ICON_CONTAINER = {
  SMALL_SIZE: TOUCH_TARGETS.SMALL, // 32 - standard small icon container
  SMALL_RADIUS: TOUCH_TARGETS.SMALL / 2, // 16 - half for perfect circle
  MEDIUM_SIZE: TOUCH_TARGETS.MEDIUM, // 44 - standard medium icon container
  MEDIUM_RADIUS: TOUCH_TARGETS.MEDIUM / 2, // 22 - half for perfect circle
} as const;

// Utility function for enhancing touch padding (moved out of constants)
export const enhanceTouchPadding = (currentSize: number): number => {
  const needed = TOUCH_TARGETS.MEDIUM - currentSize;
  return needed > 0 ? Math.ceil(needed / 2) : 0;
};

export const LAYOUT = {
  /** Left/right screen edge padding for all content (12px) */
  SCREEN_HORIZONTAL_PADDING: SPACING_SCALE.MEDIUM,
  /** @deprecated Use SCREEN_HORIZONTAL_PADDING for clarity */
  SCREEN_EDGE_PADDING: SPACING_SCALE.MEDIUM, // 12 - Alias for backwards compatibility

  CONTENT_SPACING: {
    TOP: SPACING_SCALE.LARGE, // 16 - responsive to spacing scale
    BOTTOM: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
  },

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
    TINY: 3, // Perfect circles for 6px elements (STATUS_INDICATOR dots)
    SMALL_CIRCLE: 6, // Small rounded elements
    SMALL: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
    MEDIUM: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
    LARGE: SPACING_SCALE.LARGE, // 16 - for larger cards/containers
    PILL: 9999, // Keep as is for perfect circles
  },

  CARD: {
    HEIGHT: {
      // Dynamic heights based on content
      LIST_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // 48 + 32 = 80
      AUDIO_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.XLARGE * 2, // 48 + 40 = 88
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.XXLARGE * 2, // 48 + 64 = 112 (taller for 2-line title)
      VOCABULARY_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // 48 + 32 = 80 (single-row compact layout)
    },
    IMAGE: {
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.SMALL, // 48 + 8 = 56 (increased from 40 for better balance)
    },
    WIDTH: {
      DICTIONARY_LEFT_SECTION: BASE_UNIT * 32, // 128 - more space for English text with badges
    },
  },

  INPUT: {
    HEIGHT: TOUCH_TARGETS.LARGE + BASE_UNIT, // 52 - responsive to touch targets + padding
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
    },
    ICON_SIZE: {
      SMALL: SPACING_SCALE.LARGE, // 16 - responsive to spacing scale
      MEDIUM: BASE_UNIT * 5, // 20 - responsive to base unit
      LARGE: SPACING_SCALE.XLARGE, // 24 - responsive to spacing scale
      XLARGE: BASE_UNIT * 7, // 28 - responsive to base unit
    },
  },

  TYPOGRAPHY: {
    SCALE: {
      TINY: BASE_UNIT * 2.75, // 11 - responsive to base unit
      SMALL: BASE_UNIT * 3.25, // 13 - responsive to base unit
      MEDIUM: BASE_UNIT * 3.75, // 15 - responsive to base unit
      LARGE: BASE_UNIT * 4.25, // 17 - responsive to base unit
      XLARGE: BASE_UNIT * 5, // 20 - responsive to base unit (fixed inconsistency)
      XXLARGE: BASE_UNIT * 5.5, // 22 - responsive to base unit
      HUGE: BASE_UNIT * 7, // 28 - responsive to base unit
      XXHUGE: BASE_UNIT * 8.5, // 34 - responsive to base unit
      MASSIVE: BASE_UNIT * 10, // 40 - responsive to base unit
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
  },

  WIDTH_RATIOS: {
    ALMOST_HALF: 0.48,
    THIRD: 0.3333,
  },

  CHART: {
    Y_AXIS_WIDTH: BASE_UNIT * 8, // 32 - adjusted for "100%" label visibility
    CURSOR_WIDTH: 2, // Chart interaction cursor width
    BADGE_PADDING: SPACING_SCALE.SMALL, // 8 - Chart badge padding
    BADGE_DOT_MARGIN: BASE_UNIT * 1.5, // 6 - Margin for badge dots
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

  /** Common component dimensions */
  COMPONENT: {
    PROGRESS_BAR_WIDTH: BASE_UNIT * 10, // 40 - standard progress bar width
  },

  /** Common sizes for bottom sheet UI elements */
  BOTTOM_SHEET: {
    INDICATOR: {
      WIDTH: BASE_UNIT * 9, // 36 - responsive to base unit
      HEIGHT: BASE_UNIT, // 4 - responsive to base unit
    },
    HEADER: {
      paddingHorizontal: SPACING_SCALE.MEDIUM, // 12 - consistent with practice bottom sheets
      paddingBottom: SPACING_SCALE.TINY, // 4 - consistent with practice bottom sheets
      marginBottom: SPACING_SCALE.TINY, // 4 - consistent with practice bottom sheets
      alignItems: 'center' as const, // Center the title
    },
    STYLES: {
      bottomSheet: {
        borderTopLeftRadius: SPACING_SCALE.MEDIUM, // 12 - consistent border radius
        borderTopRightRadius: SPACING_SCALE.MEDIUM, // 12 - consistent border radius
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

  /** Height for individual sentence items */
  SENTENCE_ITEM: {
    HEIGHT: BASE_UNIT * 17.5, // 70 - responsive to base unit
  },

  HEADER: {
    HEIGHT: {
      EXPANDED: TOUCH_TARGETS.LARGE * 8, // ~384 - restored for proper article and calendar display
      COLLAPSED: 0,
    },
    NAV_HEIGHT: TOUCH_TARGETS.LARGE, // 48 - Unified navigation height for both platforms
    NAV_HEADER_HEIGHT: TOUCH_TARGETS.LARGE + SPACING_SCALE.TINY, // 52 - Accommodate multi-line titles

    TITLE: {
      MAIN: {
        fontSize: BASE_UNIT * 7, // 28 - responsive to base unit
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
        marginLeft: -BASE_UNIT, // -4 - responsive negative margin
      },
      SECONDARY: {
        fontSize: BASE_UNIT * 5, // 20 - responsive to base unit (consistent with XLARGE)
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      },
      COMPACT: {
        fontSize: BASE_UNIT * 4.25, // 17 - responsive to base unit
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
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

  CALENDAR: {
    EVENT_RIGHT_SECTION: {
      MAX_WIDTH: BASE_UNIT * 37.5, // 150 - responsive to base unit
      MIN_WIDTH: BASE_UNIT * 32.5, // 130 - responsive to base unit
    },
  },

  ANIMATION: {
    DURATION: {
      FAST: BASE_UNIT * 50, // 200ms - responsive to base unit
      SLOW: BASE_UNIT * 125, // 500ms - responsive to base unit
    },
  },

  HIT_SLOP: {
    SMALL: {
      top: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
      bottom: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
      left: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
      right: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
    },
    MEDIUM: {
      top: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
      bottom: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
      left: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
      right: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
    },
  },

  BORDER: {
    WIDTH: {
      NONE: 0,
      THIN: Math.round(BASE_UNIT * 0.125), // 0.5 rounded to 1 - prevents sub-pixel rendering
      NORMAL: BASE_UNIT * 0.25, // 1 - responsive to base unit
      THICK: BASE_UNIT * 0.5, // 2 - responsive to base unit
      FOCUSED: BASE_UNIT * 0.5, // 2 - responsive to base unit
    },
    STYLE: {
      SOLID: 'solid',
      DASHED: 'dashed',
      DOTTED: 'dotted',
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

    /**
     * Bottom padding for screens with persistent bottom controls (floating buttons)
     * Adds extra space for floating action buttons above tab bar
     */
    bottomWithControls: SPACING_SCALE.XLARGE + SPACING_SCALE.SMALL, // 24px controls + 8px buffer
  },

  /**
   * Floating controls positioning (PLAY ALL, REVIEW DUE WORDS buttons)
   * Positions floating buttons above tab bar consistently
   */
  FLOATING_CONTROLS: {
    /**
     * Distance from bottom of screen to floating button
     * Tab bar handles its own safe area, so just add small gap
     */
    BOTTOM_POSITION: SPACING_SCALE.SMALL, // 8px above tab bar
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
