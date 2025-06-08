import type { TextStyle } from 'react-native';
import { Dimensions, Platform } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;

// Font family constants
export const FONTS = {
  ENGLISH: 'Figtree', // Default font for all English text
  ARABIC: 'Madina', // Font for Arabic text
} as const;

// Typography hierarchy constants - Following Apple HIG and Material Design principles
export const TYPOGRAPHY_HIERARCHY = {
  // Weight scale for better hierarchy - Enhanced for Figtree
  WEIGHTS: {
    REGULAR: '400' as const,
    MEDIUM: '500' as const,
    SEMIBOLD: '600' as const,
    BOLD: '700' as const,
    HEAVY: '800' as const,
  },

  // Sophisticated color hierarchy with semantic relationships
  COLOR_HIERARCHY: {
    PRIMARY: 1.0, // Main headings and primary content - maximum prominence
    SECONDARY: 0.85, // Secondary information - enhanced from 0.8 for better contrast
    TERTIARY: 0.65, // Metadata, captions - enhanced from 0.6 for readability
    SUBTLE: 0.5, // Disabled states - enhanced from 0.45 for accessibility
    ACCENT: 0.75, // Special accent content - new level for highlighted metadata
  },

  // Advanced letter spacing optimized for Figtree characteristics
  LETTER_SPACING: {
    TIGHT: -0.3, // For headings - simplified from EXTRA_TIGHT and TIGHT
    NORMAL: 0, // Body text default
    RELAXED: 0.3, // Metadata and captions - consolidated from RELAXED, LOOSE, EXTRA_LOOSE
  },

  // Enhanced line height ratios for optimal readability
  LINE_HEIGHT_MULTIPLIERS: {
    TIGHT: 1.2, // For headings and compact text
    NORMAL: 1.4, // Body text - optimized for Figtree
    LOOSE: 1.6, // Captions and metadata - consolidated from LOOSE and EXTRA_LOOSE
  },

  // Semantic color mappings for different content types
  SEMANTIC_COLORS: {
    PRIMARY_CONTENT: 'text', // Main titles, headings
    SECONDARY_CONTENT: 'secondaryText', // Authors, supporting info
    TERTIARY_CONTENT: 'textTertiary', // Metadata, timestamps
    ACCENT_CONTENT: 'tint', // Interactive elements, links
    AUTHOR_CONTENT: 'authorText', // Specific author styling
    ENGLISH_CONTENT: 'englishText', // English text specific
    ARABIC_CONTENT: 'arabicText', // Arabic text specific
    SUCCESS_CONTENT: 'success', // Positive states
    WARNING_CONTENT: 'warning', // Due words, attention needed
    INFO_CONTENT: 'info', // Neutral information

    // Enhanced sophisticated typography colors
    HEADING_CONTENT: 'headingText', // Primary heading color - rich and commanding
    SUBTITLE_CONTENT: 'subtitleText', // Sophisticated subtitle balance
    METADATA_CONTENT: 'metadataText', // Refined metadata color - perfect hierarchy
    CAPTION_CONTENT: 'captionText', // Enhanced caption color for optimal readability
  } as const,

  // Micro-typography enhancements
  MICRO_ADJUSTMENTS: {
    // Content-specific adjustments - removed platform-specific differences
    CONTENT_TYPES: {
      CARD_TITLE: {
        letterSpacing: -0.15, // Simplified from platform-specific values
        lineHeightMultiplier: 1.2, // Slightly tighter for better vertical rhythm with smaller text
      },
      SECTION_HEADER: {
        letterSpacing: -0.35, // Simplified from platform-specific values
        lineHeightMultiplier: 1.1, // Very tight for impact
      },
      METADATA: {
        letterSpacing: 0.3, // Simplified from platform-specific values
        lineHeightMultiplier: 1.3, // Compact but readable
      },
      AUTHOR_BYLINE: {
        letterSpacing: 0.15, // Simplified from platform-specific values
        lineHeightMultiplier: 1.25, // Tight but breathable
      },
    },
  },

  // Advanced contrast and accessibility improvements
  ACCESSIBILITY: {
    // Enhanced contrast ratios for better readability
    MIN_CONTRAST_RATIOS: {
      LARGE_TEXT: 3.0, // 18pt+ or 14pt+ bold
      NORMAL_TEXT: 4.5, // Standard text
      ENHANCED: 7.0, // AAA compliance for critical content
    },

    // Dynamic opacity adjustments based on theme
    DYNAMIC_OPACITY: {
      LIGHT_THEME_BOOST: 0.05, // Slightly increase opacity in light theme
      DARK_THEME_BOOST: 0.08, // More boost needed in dark theme
    },
  },
} as const;

// Component-specific constants
export const WORD_AREA_MIN_HEIGHT = 364;

// Minimum touch target sizes for accessibility compliance
export const MIN_TOUCH_TARGET = {
  // Apple HIG: 44pt minimum, Material: 48dp minimum
  SIZE: 48, // Use 48dp for better accessibility (exceeds both guidelines)
  MEDIUM: 44, // For standard interactive elements
  SMALL: 32, // For dense layouts where larger isn't feasible
  ICON_PADDING: 12, // Additional padding around icons to meet minimum target
} as const;

export const LAYOUT = {
  // Screen edge spacing
  SCREEN_EDGE_PADDING: 12, // Tighter horizontal margin matching index.tsx

  // List and content spacing
  LIST_VERTICAL_SPACING: 12, // Standard vertical padding for lists
  CONTENT_SPACING: {
    TOP: 16, // Increased for consistent header spacing
    BOTTOM: 12,
  },

  // Note: Section spacing moved to SPACING.XXLARGE (between sections) and SPACING.SECTION_INTERNAL (within sections)

  // Loader sizes
  LOADER: {
    SMALL: 28,
    MEDIUM: 40,
    LARGE: 52,
  },

  // Element spacing - Simplified to 7 essential sizes following Miller's Law
  SPACING: {
    TINY: 4, // Minimal spacing for tight layouts
    SMALL: 8, // Standard small spacing
    MEDIUM: 12, // Base spacing for most layouts
    LARGE: 16, // Section spacing
    XLARGE: 20, // Major section separation
    XXLARGE: 24, // Maximum spacing for visual breaks
    SECTION_INTERNAL: 8, // Within-section spacing (replaces SECTION.SPACING_INTERNAL)
  },

  /**
   * Standardized opacity values for consistent visual appearance
   * Simplified to follow Miller's Law - max 7 essential opacity levels
   */
  OPACITY: {
    // Visual hierarchy opacities
    SUBTLE: 0.3, // Barely visible elements
    MEDIUM: 0.5, // Secondary content, disabled states
    HIGH: 0.7, // Dimmed or secondary active content
    FULL: 1.0, // Primary content and active states
    // Interactive state opacities
    HOVER: 0.8, // Hover state for interactive elements
    PRESSED: 0.6, // Pressed/active state
    OVERLAY: 0.4, // Modal overlays and backgrounds
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
      SMALL: MIN_TOUCH_TARGET.SMALL, // Use minimum small touch target (32pt) for dense layouts
      MEDIUM: MIN_TOUCH_TARGET.MEDIUM, // Use 44pt for standard buttons
      LARGE: MIN_TOUCH_TARGET.SIZE, // Use 48pt for primary actions
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

  // Typography scale - Refined for better hierarchy
  TYPOGRAPHY: {
    SCALE: {
      TINY: 11, // Increased from 10 - Apple HIG minimum for accessibility
      SMALL: 13, // Increased from 12 - better readability for captions
      MEDIUM: 15, // Unchanged - for body text
      LARGE: 17, // For card titles (heading3) and emphasized body text
      XLARGE: 20, // For larger secondary headings and emphasized content
      XXLARGE: 22, // NEW - for section headers (better hierarchy)
      HUGE: 28, // Refined - for main headings (was 30)
    },
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.4, // Reduced from 1.5 for better density with Figtree
      LOOSE: 1.6, // Reduced from 1.8 for better readability
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

  // Standardized elevation values for Android
  ELEVATION: {
    NONE: 0,
    SUBTLE: 2, // For small UI elements like toggles, tooltips
    SMALL: 4, // For cards, buttons
    MEDIUM: 8, // For modals, prominent cards
    LARGE: 12, // For major UI elements
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
    NONE: { top: 0, bottom: 0, left: 0, right: 0 },
    SMALL: { top: 8, bottom: 8, left: 8, right: 8 },
    MEDIUM: { top: 12, bottom: 12, left: 12, right: 12 },
    LARGE: { top: 20, bottom: 20, left: 20, right: 20 },
    ICON: {
      top: MIN_TOUCH_TARGET.ICON_PADDING,
      bottom: MIN_TOUCH_TARGET.ICON_PADDING,
      left: MIN_TOUCH_TARGET.ICON_PADDING,
      right: MIN_TOUCH_TARGET.ICON_PADDING,
    }, // For icon-only buttons
  },

  // Touch target enhancement utilities
  TOUCH_TARGET: {
    // Minimum container sizes for interactive elements
    MIN_CONTAINER: {
      WIDTH: MIN_TOUCH_TARGET.SIZE,
      HEIGHT: MIN_TOUCH_TARGET.SIZE,
    },
    // Padding to add around small elements to meet touch target requirements
    ENHANCE_PADDING: (currentSize: number) => {
      const needed = MIN_TOUCH_TARGET.MEDIUM - currentSize;
      return needed > 0 ? Math.ceil(needed / 2) : 0;
    },
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
    // Standardized header title styles
    TITLE: {
      // Main navigation titles (tab screens)
      MAIN: {
        fontSize: 28, // HUGE - matches LAYOUT.TYPOGRAPHY.SCALE.HUGE
        fontWeight: '700', // BOLD - matches TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD
        marginLeft: -4, // TINY spacing adjustment for iOS alignment
      },
      // Secondary navigation titles (modal/stack screens)
      SECONDARY: {
        fontSize: 20, // XLARGE - standard for secondary screens
        fontWeight: '600', // SEMIBOLD - matches TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD
      },
      // Compact navigation titles (dense screens)
      COMPACT: {
        fontSize: 17, // LARGE - for compact layouts
        fontWeight: '600', // SEMIBOLD - matches TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD
      },
    },
  },
};

// Helper function to generate consistent Arabic text styles
export const getArabicTextStyle = (
  fontSize: number,
  additionalStyles: TextStyle = {}
): TextStyle => {
  return {
    fontFamily: FONTS.ARABIC,
    fontSize,
    // Increase line height to prevent clipping of Arabic diacritics
    lineHeight: Math.round(fontSize * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.ARABIC),
    writingDirection: 'rtl',
    textAlign: 'right',
    // Disable includeFontPadding to prevent Android clipping issues
    includeFontPadding: false,
    // Add minimal padding to ensure text doesn't get clipped
    paddingVertical: LAYOUT.SPACING.TINY * 1.5,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    ...additionalStyles,
  };
};

// Note: getSemanticColor was removed as it only returned the color name without any theme-aware logic
// Use TYPOGRAPHY_HIERARCHY.SEMANTIC_COLORS[colorType] directly instead

// Enhanced opacity calculator with theme-aware adjustments
export const getEnhancedOpacity = (
  baseOpacity: number,
  isDarkMode: boolean = false,
  isInteractive: boolean = false
): number => {
  let adjustedOpacity = baseOpacity;

  // Apply theme-specific boosts
  if (isDarkMode) {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.ACCESSIBILITY.DYNAMIC_OPACITY.DARK_THEME_BOOST;
  } else {
    adjustedOpacity += TYPOGRAPHY_HIERARCHY.ACCESSIBILITY.DYNAMIC_OPACITY.LIGHT_THEME_BOOST;
  }

  // Boost interactive elements slightly
  if (isInteractive) {
    adjustedOpacity += 0.05;
  }

  // Clamp to valid range
  return Math.min(1.0, Math.max(0.0, adjustedOpacity));
};
