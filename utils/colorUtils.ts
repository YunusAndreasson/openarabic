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

import { clampRgb, converter, formatHex, wcagContrast, type Oklch } from 'culori';

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
 * Generate a color scale with perceptually uniform lightness steps
 *
 * @param hue - Base hue (0-360)
 * @param baseChroma - Base chroma (0-0.4)
 * @param lightnessSteps - Array of lightness values (0-1)
 * @returns Array of hex colors
 *
 * @example
 * generateColorScale(160, 0.03, [0.18, 0.30, 0.42, 0.54, 0.66])
 * // → ["#1A2B23", "#2F4038", "#4A5B52", "#687D73", "#8B9F94"]
 */
export const generateColorScale = (
  hue: number,
  baseChroma: number,
  lightnessSteps: number[]
): string[] => {
  return lightnessSteps.map(l => {
    // Slightly increase chroma for mid-tones (more saturated in middle)
    const chromaAdjustment = 1 + Math.sin(l * Math.PI) * 0.2;
    const c = baseChroma * chromaAdjustment;
    return oklchToHex(l, c, hue);
  });
};

/**
 * Generate a full color scale (50-900) like Material Design
 *
 * @param hue - Base hue (0-360)
 * @param baseChroma - Base chroma at the 500 level
 * @param baseLightness - Base lightness at the 500 level (default: 0.42)
 * @returns Object with scale from 50 (lightest) to 900 (darkest)
 *
 * @example
 * const forestScale = generateFullColorScale(160, 0.03, 0.42)
 * // → { 50: "#F0F4F2", 100: "#E1E9E5", ..., 900: "#0F1A13" }
 */
export const generateFullColorScale = (
  hue: number,
  baseChroma: number,
  baseLightness: number = 0.42
): Record<number, string> => {
  const steps = {
    50: baseLightness + 0.53, // 0.95
    100: baseLightness + 0.48, // 0.90
    200: baseLightness + 0.38, // 0.80
    300: baseLightness + 0.23, // 0.65
    400: baseLightness + 0.11, // 0.53
    500: baseLightness, // 0.42 (base)
    600: baseLightness - 0.07, // 0.35
    700: baseLightness - 0.14, // 0.28
    800: baseLightness - 0.22, // 0.20
    900: baseLightness - 0.30, // 0.12
  };

  const scale: Record<number, string> = {};
  Object.entries(steps).forEach(([key, lightness]) => {
    // Reduce chroma for very light and very dark shades
    const chromaFactor =
      lightness > 0.85 || lightness < 0.15 ? 0.5 : 1 + Math.sin(lightness * Math.PI) * 0.2;
    scale[Number(key)] = oklchToHex(lightness, baseChroma * chromaFactor, hue);
  });

  return scale;
};

/**
 * Calculate WCAG contrast ratio between two colors
 *
 * @param foreground - Foreground hex color
 * @param background - Background hex color
 * @returns Contrast ratio (1-21)
 *
 * @example
 * getContrast("#1A2B23", "#F2F7F4") // → 12.5
 */
export const getContrast = (foreground: string, background: string): number => {
  return wcagContrast(foreground, background) || 1;
};

/**
 * Ensure a color meets WCAG contrast requirements by adjusting lightness
 *
 * @param l - Foreground lightness (0-1)
 * @param c - Foreground chroma
 * @param h - Foreground hue
 * @param background - Background hex color
 * @param targetRatio - Target WCAG ratio (4.5 for AA, 7 for AAA)
 * @param direction - Adjust "darker" or "lighter" (default: auto)
 * @returns Adjusted hex color that meets contrast requirement
 *
 * @example
 * ensureContrast(0.52, 0.035, 160, "#F2F7F4", 4.5)
 * // → "#57746A" (darker version that meets 4.5:1)
 */
export const ensureContrast = (
  l: number,
  c: number,
  h: number,
  background: string,
  targetRatio: number = 4.5,
  direction: 'darker' | 'lighter' | 'auto' = 'auto'
): string => {
  let adjustedL = l;
  const step = 0.01;
  const maxIterations = 100;
  let iterations = 0;

  // Determine direction if auto
  let shouldDarken = direction === 'darker';
  if (direction === 'auto') {
    // If background is light, darken text; if dark, lighten text
    shouldDarken = l > 0.5; // Simplification: darken if currently light
  } else if (direction === 'lighter') {
    shouldDarken = false;
  }

  while (iterations < maxIterations) {
    const testColor = oklchToHex(adjustedL, c, h);
    const contrast = getContrast(testColor, background);

    if (contrast >= targetRatio) {
      return testColor;
    }

    // Adjust lightness
    adjustedL = shouldDarken ? adjustedL - step : adjustedL + step;

    // Bounds checking
    if (adjustedL <= 0 || adjustedL >= 1) {
      // Can't meet contrast, return best attempt
      return oklchToHex(Math.max(0, Math.min(1, adjustedL)), c, h);
    }

    iterations++;
  }

  // Return adjusted color even if target not met
  return oklchToHex(adjustedL, c, h);
};

/**
 * Lighten a color by adjusting its lightness
 *
 * @param l - Current lightness (0-1)
 * @param c - Chroma
 * @param h - Hue
 * @param amount - Amount to lighten (0-1, e.g., 0.1 = 10% lighter)
 * @returns Lightened hex color, clamped to RGB gamut
 */
export const lighten = (l: number, c: number, h: number, amount: number): string => {
  return oklchToHex(Math.min(1, l + amount), c, h);
};

/**
 * Darken a color by adjusting its lightness
 *
 * @param l - Current lightness (0-1)
 * @param c - Chroma
 * @param h - Hue
 * @param amount - Amount to darken (0-1, e.g., 0.1 = 10% darker)
 * @returns Darkened hex color, clamped to RGB gamut
 */
export const darken = (l: number, c: number, h: number, amount: number): string => {
  return oklchToHex(Math.max(0, l - amount), c, h);
};

/**
 * Increase saturation (chroma) of a color
 *
 * @param l - Lightness
 * @param c - Current chroma
 * @param h - Hue
 * @param amount - Amount to increase (0-0.4, e.g., 0.02 = +2% saturation)
 * @returns More saturated hex color, clamped to RGB gamut
 */
export const saturate = (l: number, c: number, h: number, amount: number): string => {
  return oklchToHex(l, Math.min(0.4, c + amount), h);
};

/**
 * Decrease saturation (chroma) of a color
 *
 * @param l - Lightness
 * @param c - Current chroma
 * @param h - Hue
 * @param amount - Amount to decrease (0-0.4, e.g., 0.02 = -2% saturation)
 * @returns Less saturated hex color, clamped to RGB gamut
 */
export const desaturate = (l: number, c: number, h: number, amount: number): string => {
  return oklchToHex(l, Math.max(0, c - amount), h);
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
