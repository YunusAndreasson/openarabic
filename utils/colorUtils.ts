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

import { clampRgb, converter, formatHex, type Oklch, type Rgb } from 'culori';

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

/**
 * Blend two colors into a single opaque hex.
 *
 * `withAlpha` and `withOpacity` both return a translucent color, which the
 * renderer composites over whatever happens to sit behind the element. This
 * resolves the blend up front against a base you choose instead.
 *
 * That distinction matters on a dark theme. A hue laid over the near-black page
 * background at a low alpha collapses toward black whatever the hue was — 15%
 * of amber over `#040D07` is an olive-brown, not amber. Blended into an
 * elevation surface at the same weight, the hue still reads as itself.
 *
 * @param base - Hex color underneath (typically an elevation surface)
 * @param overlay - Hex color laid on top
 * @param amount - Proportion of `overlay` in the result (0 = base, 1 = overlay)
 * @returns Opaque hex color, or `base` if either input cannot be parsed
 *
 * @example
 * mixColors('#121F17', '#4EAD6D', 0.22) // → "#1E3B28"
 */
export function mixColors(base: string, overlay: string, amount: number): string {
  const ratio =
    typeof amount === 'number' && !Number.isNaN(amount) ? Math.max(0, Math.min(1, amount)) : 0;

  const baseRgb = toRgb(base);
  const overlayRgb = toRgb(overlay);

  if (!baseRgb || !overlayRgb) {
    return base;
  }

  // Gamma-space interpolation, matching how the renderer composites an alpha
  // fill — so a call here lands where the equivalent `withAlpha` would have,
  // just resolved against `base` rather than against the page.
  const blended: Rgb = {
    mode: 'rgb',
    r: (baseRgb.r ?? 0) * (1 - ratio) + (overlayRgb.r ?? 0) * ratio,
    g: (baseRgb.g ?? 0) * (1 - ratio) + (overlayRgb.g ?? 0) * ratio,
    b: (baseRgb.b ?? 0) * (1 - ratio) + (overlayRgb.b ?? 0) * ratio,
  };

  return formatHex(blended);
}

// =============================================================================
// OKLCH PALETTE CONVERSION UTILITIES
// =============================================================================

/** Type for a single OKLCH color definition */
interface OKLCHColor {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/** Type for a palette with theme variants (light/dark/sepia) */
interface ThemedOKLCHColor {
  readonly light: OKLCHColor;
  readonly dark: OKLCHColor;
  readonly sepia: OKLCHColor;
}

/**
 * Convert a flat OKLCH palette to hex values.
 * Handles palettes like forestOKLCH, sageOKLCH, tintOKLCH.
 *
 * @example
 * const forestOKLCH = { darkest: { l: 0.27, c: 0.03, h: 164 }, ... };
 * const forest = convertFlatPalette(forestOKLCH);
 * // Result: { darkest: "#1A2B23", ... }
 */
export function convertFlatPalette<T extends Record<string, OKLCHColor>>(
  palette: T,
): { [K in keyof T]: string } {
  const result = {} as { [K in keyof T]: string };
  for (const key of Object.keys(palette) as (keyof T)[]) {
    const color = palette[key] as OKLCHColor;
    result[key] = oklchToHex(color.l, color.c, color.h);
  }
  return result;
}

/**
 * Convert a themed OKLCH palette (with light/dark/sepia variants) to hex values.
 * Handles palettes like grammarOKLCH where each color has theme variants.
 *
 * @example
 * const grammarOKLCH = {
 *   golden: { light: {...}, dark: {...}, sepia: {...} },
 *   amber: { light: {...}, dark: {...}, sepia: {...} },
 * };
 * const grammar = convertThemedPalette(grammarOKLCH);
 * // Result: { golden: { light: "#...", dark: "#...", sepia: "#..." }, ... }
 */
export function convertThemedPalette<T extends Record<string, ThemedOKLCHColor>>(
  palette: T,
): { [K in keyof T]: { light: string; dark: string; sepia: string } } {
  const result = {} as { [K in keyof T]: { light: string; dark: string; sepia: string } };
  for (const key of Object.keys(palette) as (keyof T)[]) {
    const themed = palette[key] as ThemedOKLCHColor;
    result[key] = {
      light: oklchToHex(themed.light.l, themed.light.c, themed.light.h),
      dark: oklchToHex(themed.dark.l, themed.dark.c, themed.dark.h),
      sepia: oklchToHex(themed.sepia.l, themed.sepia.c, themed.sepia.h),
    };
  }
  return result;
}

/**
 * Convert a text hierarchy palette (light/dark/sepia → text levels) to hex values.
 * Preserves key types from the input palette for proper type inference.
 *
 * @example
 * const textHierarchyOKLCH = {
 *   light: { subtitle: {...}, metadata: {...} },
 *   dark: { subtitle: {...}, metadata: {...} },
 *   sepia: { subtitle: {...}, metadata: {...} },
 * };
 * const textHierarchy = convertTextHierarchyPalette(textHierarchyOKLCH);
 */
export function convertTextHierarchyPalette<
  TLight extends Record<string, OKLCHColor>,
  TDark extends Record<string, OKLCHColor>,
  TSepia extends Record<string, OKLCHColor>,
>(palette: {
  readonly light: TLight;
  readonly dark: TDark;
  readonly sepia: TSepia;
}): {
  light: { [K in keyof TLight]: string };
  dark: { [K in keyof TDark]: string };
  sepia: { [K in keyof TSepia]: string };
} {
  const result = {
    light: {} as { [K in keyof TLight]: string },
    dark: {} as { [K in keyof TDark]: string },
    sepia: {} as { [K in keyof TSepia]: string },
  };
  for (const theme of ['light', 'dark', 'sepia'] as const) {
    const levels = palette[theme];
    for (const level of Object.keys(levels)) {
      const color = levels[level] as OKLCHColor;
      (result[theme] as Record<string, string>)[level] = oklchToHex(color.l, color.c, color.h);
    }
  }
  return result;
}
