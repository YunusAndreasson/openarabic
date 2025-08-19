import type { TextStyle } from 'react-native';
import { Dimensions, Platform } from 'react-native';

const IS_IOS = Platform.OS === 'ios';

// For mobile-only apps, screen width doesn't change during runtime
// Use static width instead of dynamic useWindowDimensions
const SCREEN_DIMENSIONS = Dimensions.get('window');
export const SCREEN_WIDTH = SCREEN_DIMENSIONS?.width ?? 375; // Default fallback for test environments

export const FONTS = {
  ENGLISH: 'Inter',
  ARABIC: 'NotoSans',
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

// Touch target system based on accessibility guidelines
const TOUCH_TARGETS = {
  SMALL: BASE_UNIT * 8, // 32 - responsive to base unit
  MEDIUM: BASE_UNIT * 11, // 44 - responsive to base unit
  LARGE: BASE_UNIT * 12, // 48 - iOS/Android minimum recommended, responsive
  ICON_PADDING: BASE_UNIT * 3, // 12
} as const;

// Unified shadow/elevation system
const createShadow = (elevation: number, opacity: number, radius: number) => ({
  ...Platform.select({
    ios: {
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
  }),
});

const createElevation = (level: number, opacity: number, radius: number) => ({
  level,
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

  ACCESSIBILITY: {
    MIN_CONTRAST_RATIOS: {
      LARGE_TEXT: 3.0,
      NORMAL_TEXT: 4.5,
      ENHANCED: 7.0,
    },
    DYNAMIC_OPACITY: {
      LIGHT_THEME_BOOST: 0.05,
      DARK_THEME_BOOST: 0.08,
    },
  },
} as const;

// Dynamic word area height based on screen proportions and touch targets
export const WORD_AREA_MIN_HEIGHT = TOUCH_TARGETS.LARGE * 7.5; // ~360px, responsive to touch targets

// Export touch targets for backward compatibility and external use
export const MIN_TOUCH_TARGET = TOUCH_TARGETS;

// Utility function for enhancing touch padding (moved out of constants)
export const enhanceTouchPadding = (currentSize: number): number => {
  const needed = TOUCH_TARGETS.MEDIUM - currentSize;
  return needed > 0 ? Math.ceil(needed / 2) : 0;
};

export const LAYOUT = {
  SCREEN_EDGE_PADDING: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale

  CONTENT_SPACING: {
    TOP: SPACING_SCALE.LARGE, // 16 - responsive to spacing scale
    BOTTOM: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
  },

  SPACING: SPACING_SCALE,

  /**
   * Standardized opacity values for consistent visual appearance
   * Simplified to follow Miller's Law - max 7 essential opacity levels
   */
  OPACITY: {
    SUBTLE: 0.3,
    MEDIUM: 0.5,
    HIGH: 0.7,
    FULL: 1.0,

    HOVER: 0.8,
    PRESSED: 0.6,
    OVERLAY: 0.4,
  },

  BOTTOM_BAR: {
    HEIGHT: IS_IOS ? 83 : 65, // Standard iOS tab bar height: 83px, Android: 65px
  },

  BORDER_RADIUS: {
    SMALL: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
    MEDIUM: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
    PILL: 9999, // Keep as is for perfect circles
  },

  CARD: {
    PADDING: {
      SMALL: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
      MEDIUM: SPACING_SCALE.MEDIUM, // 12 - responsive to spacing scale
      LARGE: SPACING_SCALE.LARGE, // 16 - responsive to spacing scale
    },
    HEIGHT: {
      // Dynamic heights based on content and accessibility
      LIST_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // 48 + 32 = 80
      AUDIO_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.XLARGE * 2, // 48 + 40 = 88
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.XLARGE * 2, // 48 + 48 = 96 (increased from 72 for better proportions)
      VOCABULARY_ITEM: TOUCH_TARGETS.LARGE + SPACING_SCALE.LARGE * 2, // 48 + 32 = 80 (single-row compact layout)
    },
    IMAGE: {
      MINI_PLAYER: TOUCH_TARGETS.LARGE + SPACING_SCALE.SMALL, // 48 + 8 = 56 (increased from 40 for better balance)
    },
  },

  INPUT: {
    HEIGHT: TOUCH_TARGETS.LARGE + BASE_UNIT, // 52 - responsive to touch targets + padding
    BORDER_RADIUS: SPACING_SCALE.SMALL, // 8 - responsive to spacing scale
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
    Y_AXIS_WIDTH: BASE_UNIT * 9, // 36 - ample room so '100%' isn't clipped across fonts
  },

  /** Standard height for thin progress bars */
  PROGRESS_BAR: {
    HEIGHT: BASE_UNIT, // 4 - responsive to base unit (changed from 0.75 to avoid fractional pixels)
  },

  /** Common sizes for bottom sheet UI elements */
  BOTTOM_SHEET: {
    INDICATOR: {
      WIDTH: BASE_UNIT * 9, // 36 - responsive to base unit
      HEIGHT: BASE_UNIT, // 4 - responsive to base unit
    },
  },

  /** Height for individual sentence items */
  SENTENCE_ITEM: {
    HEIGHT: BASE_UNIT * 17.5, // 70 - responsive to base unit
  },

  HEADER: {
    HEIGHT: {
      EXPANDED: TOUCH_TARGETS.LARGE * 8, // ~380 - responsive to touch targets
      COLLAPSED: 0,
    },
    NAV_HEIGHT: IS_IOS ? TOUCH_TARGETS.MEDIUM : TOUCH_TARGETS.LARGE + SPACING_SCALE.SMALL, // Platform-specific responsive heights
    NAV_HEADER_HEIGHT: IS_IOS ? TOUCH_TARGETS.LARGE * 2 + BASE_UNIT : SPACING_SCALE.XLARGE * 4, // Platform-specific responsive heights

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
};

export const getArabicTextStyle = (
  fontSize: number,
  additionalStyles: TextStyle = {},
  fontFamily: string = FONTS.ARABIC
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
  isInteractive: boolean = false
): number => {
  let adjustedOpacity = baseOpacity;

  if (isDarkMode) {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.ACCESSIBILITY.DYNAMIC_OPACITY.DARK_THEME_BOOST;
  } else {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.ACCESSIBILITY.DYNAMIC_OPACITY.LIGHT_THEME_BOOST;
  }

  if (isInteractive) {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.ACCESSIBILITY.DYNAMIC_OPACITY.LIGHT_THEME_BOOST; // 0.05 - use existing constant
  }

  return Math.min(1.0, Math.max(0.0, adjustedOpacity));
};
