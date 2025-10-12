/**
 * Color Utilities for OKLCH Color Space
 *
 * These utilities enable perceptually uniform color manipulation and generation.
 * All colors are defined in OKLCH and converted to hex for React Native compatibility.
 *
 * OKLCH Color Space:
 * - L (Lightness): 0-1 (0 = black, 1 = white)
 * - C (Chroma/Saturation): 0-0.4 (0 = gray, 0.4 = highly saturated)
 * - H (Hue): 0-360 (degrees on color wheel)
 */

import { clampRgb, converter, formatHex, type Oklch } from 'culori';

/**
 * Convert OKLCH color to hex string for React Native
 *
 * @param l - Lightness (0-1)
 * @param c - Chroma (0-0.4)
 * @param h - Hue (0-360 degrees)
 * @returns Hex color string (e.g., "#5B7F68"), clamped to displayable RGB gamut
 *
 * @example
 * oklchToHex(0.55, 0.08, 155) // → "#5B7F68" (sage green)
 */
export const oklchToHex = (l: number, c: number, h: number): string => {
  const oklchColor: Oklch = {
    mode: 'oklch',
    l,
    c,
    h,
  };
  // Clamp to RGB gamut to prevent out-of-gamut colors
  return formatHex(clampRgb(oklchColor));
};


/**
 * Apply alpha transparency to a color
 *
 * @param hexColor - Base hex color
 * @param alpha - Alpha value (0-1)
 * @returns Hex color with alpha channel (e.g., "#5B7F68CC")
 */
export const withAlpha = (hexColor: string, alpha: number): string => {
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hexColor}${alphaHex}`;
};

// Create RGB converter once for performance
const toRgb = converter('rgb');

/**
 * Create an rgba color string from a hex color and opacity
 * Uses culori for robust color parsing and conversion
 *
 * @param hex - Hex color string (e.g., "#FF5500")
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA color string (e.g., "rgba(255,85,0,0.5)")
 */
export function withOpacity(hex: string, opacity: number): string {
  const validOpacity =
    typeof opacity === 'number' && !Number.isNaN(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;

  // Validate input before parsing
  if (!hex || typeof hex !== 'string') {
    return `rgba(0,0,0,${validOpacity})`;
  }

  // Parse and convert to RGB using culori
  const rgb = toRgb(hex);

  if (!rgb) {
    return `rgba(0,0,0,${validOpacity})`;
  }

  // Extract RGB values (culori returns 0-1 range, convert to 0-255)
  const r = Math.round((rgb.r ?? 0) * 255);
  const g = Math.round((rgb.g ?? 0) * 255);
  const b = Math.round((rgb.b ?? 0) * 255);

  return `rgba(${r},${g},${b},${validOpacity})`;
}
