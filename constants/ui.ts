/**
 * Common UI constants used across the application
 *
 * These constants provide standardized values for common UI elements
 * to maintain consistency throughout the app.
 */

import { LAYOUT } from './layout';

/**
 * Standard font weights for typography
 */
export const FONT_WEIGHTS = {
  REGULAR: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700',
} as const;

/**
 * Standard opacity values for various UI states
 */
export const OPACITY = {
  ...LAYOUT.OPACITY,
  // Additional application-specific opacities
  PLACEHOLDER: 0.4,
  CAPTION: 0.6,
  SECONDARY_TEXT: 0.75,
} as const;

/**
 * Standard animation and interaction timing values
 */
export const TIMING = {
  /**
   * Animation durations
   */
  ANIMATION: LAYOUT.ANIMATION.DURATION,

  /**
   * Standard timing values for UI interactions
   */
  INTERACTION: {
    /**
     * Delay before showing a tooltip
     */
    TOOLTIP_DELAY: 500,

    /**
     * Duration to show a tooltip
     */
    TOOLTIP_DURATION: 2000,

    /**
     * Delay before triggering a long press
     */
    LONG_PRESS_DELAY: 500,
  },
} as const;

/**
 * Standard sizes for common UI elements
 */
export const ELEMENT_SIZES = {
  ICON: {
    TINY: 16,
    SMALL: 20,
    MEDIUM: 24,
    LARGE: 32,
    XLARGE: 48,
  },

  AVATAR: {
    SMALL: 32,
    MEDIUM: 48,
    LARGE: 64,
    XLARGE: 96,
  },

  BUTTON: {
    HEIGHT: LAYOUT.BUTTON.HEIGHT,
    PADDING: LAYOUT.BUTTON.PADDING,
    ICON_SIZE: {
      SMALL: 16,
      MEDIUM: 20,
      LARGE: 24,
    },
  },
} as const;
