/**
 * Utility functions for working with colors
 */

/**
 * Convert a hex color to RGB components.
 *
 * @param hex - Hex color string (e.g., "#FF5500" or "#F50")
 * @returns RGB color components as a string "r,g,b"
 */
function hexToRgb(hex: string): string {
  if (!hex || typeof hex !== 'string') {
    return '0,0,0';
  }

  hex = hex.replace(/^#/, '').trim();

  // Expand shorthand #RGB/#RGBA to full form
  if (hex.length === 3 || hex.length === 4) {
    const [r = '0', g = '0', b = '0', a] = hex;
    hex = r + r + g + g + b + b + (a ? a + a : '');
  }

  // Ignore alpha component if present (#RRGGBBAA)
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }

  if (!/^[\dA-Fa-f]{6}$/.test(hex)) {
    return '0,0,0';
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return '0,0,0';
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
  const validOpacity =
    typeof opacity === 'number' && !Number.isNaN(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  return `rgba(${hexToRgb(hex)},${validOpacity})`;
}
