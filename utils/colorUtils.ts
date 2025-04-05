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
  // Validate input
  if (!hex || typeof hex !== 'string') {
    return '0,0,0'; // Return black as fallback
  }

  // Remove the hash if it exists
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #F50)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Validate hex format
  if (!/^[\dA-Fa-f]{6}$/.test(hex)) {
    return '0,0,0'; // Return black as fallback
  }

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return '0,0,0'; // Return black as fallback
  }

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
  // Validate opacity
  const validOpacity = Math.max(0, Math.min(1, opacity));
  return `rgba(${hexToRgb(hex)},${validOpacity})`;
}
