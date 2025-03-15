/**
 * Centralized animation configuration
 *
 * This file consolidates animation parameters in a single place to ensure
 * animations are consistent across the app.
 */

import { LAYOUT } from '../../constants/layout';

/**
 * Standard animation durations
 */
export const DURATIONS = {
  /**
   * Fast animations for subtle effects (150-200ms)
   * Use for: Micro-interactions, buttons, hover states, small UI elements
   */
  FAST: LAYOUT.ANIMATION.DURATION.FAST,

  /**
   * Normal animations for standard transitions (250-300ms)
   * Use for: Card transitions, list items, modal entry/exit
   */
  NORMAL: LAYOUT.ANIMATION.DURATION.NORMAL,

  /**
   * Slow animations for dramatic effects (400-500ms)
   * Use for: Page transitions, complex animations, emphasis
   */
  SLOW: LAYOUT.ANIMATION.DURATION.SLOW,
};

/**
 * Animation presets for common scenarios
 */
export const PRESETS = {
  /**
   * Button press animation
   */
  BUTTON_PRESS: {
    duration: DURATIONS.FAST,
    startScale: 0.95,
    endScale: 1,
  },

  /**
   * Card press animation
   */
  CARD_PRESS: {
    duration: DURATIONS.FAST,
    startScale: 0.98,
    endScale: 1,
    opacityChange: 0.05,
  },

  /**
   * Modal entry/exit animation
   */
  MODAL: {
    duration: DURATIONS.NORMAL,
    fadeInDuration: DURATIONS.NORMAL,
    fadeOutDuration: DURATIONS.FAST,
  },

  /**
   * List item entry animation
   */
  LIST_ITEM: {
    duration: DURATIONS.NORMAL,
    delay: 30, // ms delay between items
    staggered: true,
  },
};
