/**
 * Standard tooltip colors that remain consistent across the app
 * These are solid colors (no transparency) that match the visual style
 * of overlay colors but are fully opaque for better readability
 */
export const TOOLTIP_COLORS = {
  /**
   * Dark mode tooltip background - matches textOverlay from Colors.ts but with 100% opacity
   */
  DARK: '#333333',

  /**
   * Light mode tooltip background - matches overlay from Colors.ts but with 100% opacity
   */
  LIGHT: '#F2F2F2',
} as const;
