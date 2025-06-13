import type { TextStyle } from 'react-native';
import { Platform, useWindowDimensions } from 'react-native';

export const useScreenWidth = (): number => {
  return useWindowDimensions().width;
};

export const FONTS = {
  ENGLISH: 'Figtree',
  ARABIC: 'Madina',
} as const;

// Base scale for systematic sizing
const BASE_UNIT = 4;

// Systematic spacing scale based on base unit
const SPACING_SCALE = {
  MICRO: BASE_UNIT * 0.25, // 1
  TINY: BASE_UNIT, // 4
  SMALL: BASE_UNIT * 2, // 8
  MEDIUM: BASE_UNIT * 3, // 12
  LARGE: BASE_UNIT * 4, // 16
  XLARGE: BASE_UNIT * 5, // 20
  XXLARGE: BASE_UNIT * 6, // 24
  XXXLARGE: BASE_UNIT * 8, // 32
  SECTION_INTERNAL: BASE_UNIT * 2, // 8
} as const;

// Touch target system based on accessibility guidelines
const TOUCH_TARGETS = {
  SMALL: 32,
  MEDIUM: 44,
  LARGE: 48, // iOS/Android minimum recommended
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

const ELEVATION_SYSTEM = {
  NONE: { level: 0, ...createShadow(0, 0, 0) },
  SUBTLE: { level: 2, ...createShadow(2, 0.15, 2) },
  SMALL: { level: 4, ...createShadow(4, 0.25, 6) },
  MEDIUM: { level: 8, ...createShadow(8, 0.3, 10) },
  LARGE: { level: 12, ...createShadow(12, 0.35, 14) },
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
    TIGHT: -0.3,
    NORMAL: 0,
    RELAXED: 0.3,
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

export const WORD_AREA_MIN_HEIGHT = 364;

// Export touch targets for backward compatibility and external use
export const MIN_TOUCH_TARGET = TOUCH_TARGETS;

// Helper functions for systematic design
export const getSystematicSpacing = (multiplier: number): number => {
  return BASE_UNIT * multiplier;
};

export const getOptimalLineHeight = (
  fontSize: number,
  contentType: 'arabic' | 'english' = 'english'
): number => {
  const multiplier =
    contentType === 'arabic'
      ? TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.ARABIC
      : TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL;
  return Math.round(fontSize * multiplier);
};

export const getAccessibleTouchTarget = (
  currentSize: number
): { padding: number; minSize: number } => {
  const minSize = TOUCH_TARGETS.MEDIUM;
  const padding = currentSize < minSize ? Math.ceil((minSize - currentSize) / 2) : 0;
  return { padding, minSize };
};

export const LAYOUT = {
  SCREEN_EDGE_PADDING: 12,

  CONTENT_SPACING: {
    TOP: 16,
    BOTTOM: 12,
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
    HEIGHT: Platform.OS === 'ios' ? 65 : 45,
  },

  BORDER_RADIUS: {
    MEDIUM: 12,
    PILL: 9999,
  },

  CARD: {
    PADDING: {
      SMALL: SPACING_SCALE.SMALL,
      MEDIUM: SPACING_SCALE.MEDIUM,
      LARGE: SPACING_SCALE.LARGE,
    },
  },

  INPUT: {
    HEIGHT: 52,
    BORDER_RADIUS: 8,
    BORDER_WIDTH: {
      DEFAULT: 1.5,
      FOCUSED: 2,
    },
  },

  BUTTON: {
    HEIGHT: {
      SMALL: TOUCH_TARGETS.SMALL,
      MEDIUM: TOUCH_TARGETS.MEDIUM,
      LARGE: TOUCH_TARGETS.LARGE,
    },
    ICON_SIZE: {
      SMALL: 16,
      MEDIUM: 20,
      LARGE: 24,
    },
  },

  TYPOGRAPHY: {
    SCALE: {
      TINY: 11,
      SMALL: 13,
      MEDIUM: 15,
      LARGE: 17,
      XLARGE: 20,
      XXLARGE: 22,
      HUGE: 28,
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

  ANIMATION: {
    DURATION: {
      FAST: 200,
      SLOW: 500,
    },
  },

  HIT_SLOP: {
    MEDIUM: {
      top: SPACING_SCALE.MEDIUM,
      bottom: SPACING_SCALE.MEDIUM,
      left: SPACING_SCALE.MEDIUM,
      right: SPACING_SCALE.MEDIUM,
    },
  },

  TOUCH_TARGET: {
    MIN_CONTAINER: {
      WIDTH: TOUCH_TARGETS.LARGE,
      HEIGHT: TOUCH_TARGETS.LARGE,
    },

    ENHANCE_PADDING: (currentSize: number) => {
      const needed = TOUCH_TARGETS.MEDIUM - currentSize;
      return needed > 0 ? Math.ceil(needed / 2) : 0;
    },
  },

  BORDER: {
    WIDTH: {
      NONE: 0,
      THIN: 0.5,
      NORMAL: 1,
      THICK: 2,
    },
    STYLE: {
      SOLID: 'solid',
      DASHED: 'dashed',
      DOTTED: 'dotted',
    },
  },

  HEADER: {
    HEIGHT: {
      EXPANDED: 380,
      COLLAPSED: 0,
    },
    NAV_HEIGHT: Platform.OS === 'ios' ? 44 : 56,
    NAV_HEADER_HEIGHT: Platform.OS === 'ios' ? 100 : 80,

    TITLE: {
      MAIN: {
        fontSize: 28,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
        marginLeft: -4,
      },
      SECONDARY: {
        fontSize: 20,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      },
      COMPACT: {
        fontSize: 17,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      },
    },
  },
};

export const getArabicTextStyle = (
  fontSize: number,
  additionalStyles: TextStyle = {}
): TextStyle => {
  return {
    fontFamily: FONTS.ARABIC,
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
    adjustedOpacity += 0.05;
  }

  return Math.min(1.0, Math.max(0.0, adjustedOpacity));
};
