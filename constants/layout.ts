import type { TextStyle } from 'react-native';
import { Platform, useWindowDimensions } from 'react-native';

export const useScreenWidth = (): number => {
  return useWindowDimensions().width;
};

export const FONTS = {
  ENGLISH: 'Figtree',
  ARABIC: 'Madina',
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

export const MIN_TOUCH_TARGET = {
  SIZE: 48,
  MEDIUM: 44,
  SMALL: 32,
  ICON_PADDING: 12,
} as const;

export const LAYOUT = {
  SCREEN_EDGE_PADDING: 12,

  CONTENT_SPACING: {
    TOP: 16,
    BOTTOM: 12,
  },

  SPACING: {
    TINY: 4,
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    XLARGE: 20,
    XXLARGE: 24,
    SECTION_INTERNAL: 8,
  },

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
      SMALL: 8,
      MEDIUM: 12,
      LARGE: 16,
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
      SMALL: MIN_TOUCH_TARGET.SMALL,
      MEDIUM: MIN_TOUCH_TARGET.MEDIUM,
      LARGE: MIN_TOUCH_TARGET.SIZE,
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
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.4,
      LOOSE: 1.6,
      ARABIC: 2.2,
    },
  },

  SHADOW: {
    SMALL: {
      ...Platform.select({
        ios: {
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    MEDIUM: {
      ...Platform.select({
        ios: {
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    LARGE: {
      ...Platform.select({
        ios: {
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
        },
        android: {
          elevation: 12,
        },
      }),
    },
  },

  ELEVATION: {
    NONE: 0,
    SUBTLE: 2,
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12,
  },

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
    MEDIUM: { top: 12, bottom: 12, left: 12, right: 12 },
  },

  TOUCH_TARGET: {
    MIN_CONTAINER: {
      WIDTH: MIN_TOUCH_TARGET.SIZE,
      HEIGHT: MIN_TOUCH_TARGET.SIZE,
    },

    ENHANCE_PADDING: (currentSize: number) => {
      const needed = MIN_TOUCH_TARGET.MEDIUM - currentSize;
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
        fontWeight: '700',
        marginLeft: -4,
      },

      SECONDARY: {
        fontSize: 20,
        fontWeight: '600',
      },

      COMPACT: {
        fontSize: 17,
        fontWeight: '600',
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

    lineHeight: Math.round(fontSize * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.ARABIC),
    writingDirection: 'rtl',
    textAlign: 'right',

    includeFontPadding: false,

    paddingVertical: LAYOUT.SPACING.TINY * 1.5,
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
