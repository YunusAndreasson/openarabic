import type { TextStyle } from 'react-native';
import { Dimensions, Platform } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Add constants for CollapsibleHeader component
export const HEADER_HEIGHT = 50;
export const HEADER_IMAGE_HEIGHT = 200;

export const LAYOUT = {
  // Screen edge spacing
  SCREEN_EDGE_PADDING: 12, // Tighter horizontal margin matching index.tsx

  // List and content spacing
  LIST_VERTICAL_SPACING: 12, // Standard vertical padding for lists
  CONTENT_SPACING: {
    TOP: 16, // Increased for consistent header spacing
    BOTTOM: 12,
  },

  // Loader sizes
  LOADER: {
    SMALL: 28,
    MEDIUM: 40,
    LARGE: 52,
  },

  // Element spacing
  SPACING: {
    TINY: 4,
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    XLARGE: 20,
    XXLARGE: 24,
  },

  /**
   * Standardized opacity values for consistent visual appearance
   *
   * General purpose opacity values (XLIGHT through FULL) should be used for
   * static visual elements, while UI state opacities (DISABLED, HOVER, etc.)
   * should be used for interactive elements in different states.
   */
  OPACITY: {
    // General purpose opacity values
    XLIGHT: 0.1,
    LIGHT: 0.3,
    MEDIUM: 0.5,
    MEDIUM_HIGH: 0.7,
    HIGH: 0.85,
    XHIGH: 0.95,
    FULL: 1.0,
    // UI state opacities
    DISABLED: 0.5,
    DIMMED: 0.7,
    HOVER: 0.9,
    PRESSED: 0.7,
    OVERLAY: 0.4,
    ACTIVE: 1,
  },

  // Specific component heights
  BOTTOM_BAR: {
    HEIGHT: Platform.OS === 'ios' ? 65 : 45, // Reduced height for both platforms
    MARGIN: 12, // Tighter margin for bottom elements
  },

  // Unified border radius system
  BORDER_RADIUS: {
    NONE: 0,
    XSMALL: 4, // For small UI elements like text placeholders
    SMALL: 8, // For inputs, small buttons, cards
    MEDIUM: 12, // Standard radius for most components
    LARGE: 16, // For featured cards and containers
    XLARGE: 24, // For more pronounced rounding
    PILL: 9999, // For pill-shaped elements (or use width/2 for circular)
  },

  // Card dimensions
  CARD: {
    PADDING: {
      SMALL: 8, // Tighter padding for compact cards
      MEDIUM: 12, // Standard padding
      LARGE: 16, // Spacious padding for featured cards
    },
    MARGIN: {
      SMALL: 4, // Tighter margin for grid layouts
      MEDIUM: 8, // Standard margin
      LARGE: 12, // Spacious margin for featured cards
    },
  },

  // Input and form elements
  INPUT: {
    HEIGHT: 52, // Standard input height
    BORDER_RADIUS: 8, // Same as BORDER_RADIUS.SMALL
    BORDER_WIDTH: {
      DEFAULT: 1.5,
      FOCUSED: 2,
    },
  },

  // Button dimensions
  BUTTON: {
    HEIGHT: {
      SMALL: 36,
      MEDIUM: 44,
      LARGE: 52,
    },
    BORDER_RADIUS: {
      SMALL: 8, // Same as BORDER_RADIUS.SMALL
      MEDIUM: 12, // Same as BORDER_RADIUS.MEDIUM
      LARGE: 24, // Same as BORDER_RADIUS.XLARGE
    },
    PADDING: {
      HORIZONTAL: {
        SMALL: 12,
        MEDIUM: 16,
        LARGE: 20,
      },
      VERTICAL: {
        SMALL: 8,
        MEDIUM: 12,
        LARGE: 16,
      },
    },
    ICON_SIZE: {
      SMALL: 16,
      MEDIUM: 20,
      LARGE: 24,
    },
  },

  // Typography scale
  TYPOGRAPHY: {
    SCALE: {
      TINY: 10, // Reduced from 11 for overline text
      SMALL: 12, // Reduced from 13 for captions and labels
      MEDIUM: 15, // Unchanged - for body text
      LARGE: 17, // For emphasized body or small headings
      XLARGE: 20, // Unchanged - for heading3
      XXLARGE: 24, // Unchanged - for heading2
      HUGE: 30, // Reduced from 32 for heading1 (less overwhelming)
    },
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      LOOSE: 1.8,
      ARABIC: 2.2, // Specific multiplier for Arabic text to prevent clipping
    },
  },

  // Shadow configurations for different elevations
  SHADOW: {
    SMALL: {
      ...Platform.select({
        ios: {
          // shadowColor will be set by the component using colors.black or colors.shadow
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
          // shadowColor will be set by the component using colors.black or colors.shadow
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
          // shadowColor will be set by the component using colors.black or colors.shadow
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

  // Z-index and elevation levels for layering
  Z_INDEX: {
    BASE: 0,
    CARD: 1,
    HEADER: 2,
    MODAL: 3,
    OVERLAY: 4,
    TOOLTIP: 5,
    POPUP: 6,
  },

  // Width ratios for grid and column layouts
  WIDTH_RATIOS: {
    ALMOST_HALF: 0.48, // Slightly less than half for paired elements with margin
    HALF: 0.5, // Exact half
    THIRD: 0.3333, // Third
    TWO_THIRDS: 0.6667, // Two thirds
    QUARTER: 0.25, // Quarter
    THREE_QUARTERS: 0.75, // Three quarters
    TWO_FIFTHS: 0.4, // 40% width
    FULL: 1, // Full width
  },

  // Animation timing constants (in milliseconds)
  ANIMATION: {
    DURATION: {
      FAST: 200,
      NORMAL: 300,
      SLOW: 500,
    },
  },

  // Standard hit slop sizes for better touch targets
  HIT_SLOP: {
    SMALL: { top: 8, bottom: 8, left: 8, right: 8 },
    MEDIUM: { top: 12, bottom: 12, left: 12, right: 12 },
    LARGE: { top: 20, bottom: 20, left: 20, right: 20 },
  },

  // Border styles
  BORDER: {
    WIDTH: {
      NONE: 0, // No border
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

  // Header dimensions
  HEADER: {
    HEIGHT: {
      EXPANDED: 380,
      COLLAPSED: 0,
    },
    NAV_HEIGHT: Platform.OS === 'ios' ? 44 : 56,
    NAV_HEADER_HEIGHT: Platform.OS === 'ios' ? 100 : 80,
  },
};

// Helper function to generate consistent Arabic text styles
export const getArabicTextStyle = (
  fontSize: number,
  additionalStyles: TextStyle = {}
): TextStyle => {
  return {
    fontFamily: 'NotoNaskhArabic',
    fontSize,
    lineHeight: Math.round(fontSize * 1.7),
    writingDirection: 'rtl',
    textAlign: 'right',
    includeFontPadding: true,
    paddingVertical: LAYOUT.SPACING.TINY,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    ...additionalStyles,
  };
};
