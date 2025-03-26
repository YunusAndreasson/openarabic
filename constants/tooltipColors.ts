/**
 * Standard tooltip colors that remain consistent across the app
 * These are solid colors (no transparency) that match the visual style
 * of overlay colors but are fully opaque for better readability
 */
export const TOOLTIP_COLORS = {
  /**
   * Dark mode tooltip background - uses elevation2 color for better contrast
   */
  DARK: '#2C2C2C',

  /**
   * Light mode tooltip background - uses elevation1 color for subtle appearance
   */
  LIGHT: '#F0F0F0',

  /**
   * Dark mode word highlight - uses a fainter version to emphasize tooltip
   */
  WORD_HIGHLIGHT_DARK: 'rgba(46, 45, 45, 0.6)',

  /**
   * Light mode word highlight - uses a fainter version to emphasize tooltip
   */
  WORD_HIGHLIGHT_LIGHT: 'rgba(240, 240, 240, 0.7)',
} as const;
