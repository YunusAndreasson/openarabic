import { Dimensions, Platform } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const LAYOUT = {
  // Screen edge spacing
  SCREEN_EDGE_PADDING: 12, // Tighter horizontal margin matching index.tsx

  // List and content spacing
  LIST_VERTICAL_SPACING: 12, // Standard vertical padding for lists
  CONTENT_SPACING: {
    TOP: 16, // Increased for consistent header spacing
    BOTTOM: 12,
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

  // Specific component heights
  BOTTOM_BAR: {
    HEIGHT: 49, // Match tab bar height
    MARGIN: 12, // Tighter margin for bottom elements
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
    BORDER_RADIUS: {
      SMALL: 8, // Subtle rounded corners
      MEDIUM: 12, // Standard rounded corners
      LARGE: 16, // More pronounced rounded corners
    },
  },

  // Input and form elements
  INPUT: {
    HEIGHT: 52, // Standard input height
    BORDER_RADIUS: 8, // Consistent with small card radius
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
      SMALL: 8,
      MEDIUM: 12,
      LARGE: 30,
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
  },

  // Typography scale
  TYPOGRAPHY: {
    SCALE: {
      TINY: 11,
      SMALL: 13,
      MEDIUM: 15,
      LARGE: 17,
      XLARGE: 20,
      XXLARGE: 24,
      HUGE: 32,
    },
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      LOOSE: 1.8,
    },
  },

  // Shadow configurations for different elevations
  SHADOW: {
    SMALL: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    MEDIUM: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    LARGE: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Opacity levels for various UI states
  OPACITY: {
    DISABLED: 0.5,
    DIMMED: 0.7,
    OVERLAY: 0.4,
    PRESSED: 0.8,
    HOVER: 0.9,
    ACTIVE: 1,
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

  // Animation timing constants (in milliseconds)
  ANIMATION: {
    DURATION: {
      FAST: 200,
      NORMAL: 300,
      SLOW: 500,
    },
  },

  // Border styles
  BORDER: {
    WIDTH: {
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
