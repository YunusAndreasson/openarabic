/**
 * Utility functions for working with colors
 */

/**
 * Convert a hex color to RGB components.
 *
 * @param hex - Hex color string (e.g., "#FF5500" or "#F50")
 * @returns RGB color components as a string "r,g,b"
 */
export function hexToRgb(hex: string): string {
  // Remove the hash if it exists
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #F50)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r},${g},${b}`;
}

/**
 * Create an rgba color string from a hex color and opacity
 *
 * @param hex - Hex color string (e.g., "#FF5500")
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA color string (e.g., "rgba(255,85,0,0.5)")
 */
export function withOpacity(hex: string, opacity: number): string {
  return `rgba(${hexToRgb(hex)},${opacity})`;
}

/**
 * Convert a hex alpha value to a decimal opacity
 *
 * @param hexAlpha - Two-character hex alpha (e.g., "80")
 * @returns Decimal opacity between 0 and 1
 */
export function hexAlphaToOpacity(hexAlpha: string): number {
  return parseInt(hexAlpha, 16) / 255;
}

/**
 * Convert a decimal opacity to a hex alpha value
 *
 * @param opacity - Decimal opacity between 0 and 1
 * @returns Two-character hex alpha
 */
export function opacityToHexAlpha(opacity: number): string {
  return Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Add opacity to a hex color using hex notation
 *
 * @param hex - Hex color string (e.g., "#FF5500")
 * @param opacity - Opacity value between 0 and 1
 * @returns Hex color with alpha (e.g., "#FF550080")
 */
export function withHexOpacity(hex: string, opacity: number): string {
  hex = hex.replace(/^#/, '');
  return `#${hex}${opacityToHexAlpha(opacity)}`;
}

/**
 * Lighten a color by the given amount
 *
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened color as hex
 */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex).split(',').map(Number);
  const newRgb = rgb.map(c => Math.min(255, c + Math.round(amount * 255)));

  return '#' + newRgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Darken a color by the given amount
 *
 * @param hex - Hex color string
 * @param amount - Amount to darken (0-1)
 * @returns Darkened color as hex
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex).split(',').map(Number);
  const newRgb = rgb.map(c => Math.max(0, c - Math.round(amount * 255)));

  return '#' + newRgb.map(c => c.toString(16).padStart(2, '0')).join('');
}
