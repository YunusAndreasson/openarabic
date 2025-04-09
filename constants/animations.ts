/**
 * Animation and interaction timing constants
 * Use these for consistent timing throughout the app
 */

export const ANIMATION_TIMING = {
  /**
   * Animation durations (in milliseconds)
   */
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },

  /**
   * Debounce durations for interactive elements (in milliseconds)
   */
  DEBOUNCE: {
    /**
     * Ultra-short delay for rapid interactions like typing
     */
    EXTRA_SHORT: 50,

    /**
     * Short delay for quick interactions
     */
    SHORT: 150,

    /**
     * Standard delay for most button interactions
     */
    STANDARD: 300,

    /**
     * Longer delay for more significant actions
     */
    LONG: 500,
  },
};
