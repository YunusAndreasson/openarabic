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

import { clamp01 } from '@/utils/dateTimeUtils';

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
  const validOpacity = typeof opacity === 'number' && !Number.isNaN(opacity) ? clamp01(opacity) : 1;

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
  const ratio = typeof amount === 'number' && !Number.isNaN(amount) ? clamp01(amount) : 0;

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

/**
 * How a hue is turned into a "tonal" control surface — a fill quiet enough to
 * sit beside other controls, but still recognisably its own colour.
 *
 * These weights were derived on the review screen's grade chips, where the
 * problem shows most clearly: an alpha fill composites against whatever is
 * behind the control, which there is a near-black page, so every hue at 15%
 * resolved to a different shade of sludge — "Guessed" came out an olive-brown,
 * "Knew it" a barely-green charcoal. Three outcomes, three sludges. Mixing into
 * an elevation surface instead keeps each hue itself and lifts the control off
 * the page as a surface.
 *
 * The border stays alpha deliberately — it composites over the control's own
 * opaque fill, so it reads as a stronger edge of the same hue rather than
 * washing out. It is what carries the colour at rest.
 */
const TONAL_SURFACE = {
  /** Hue mixed into the elevation surface for the resting fill. */
  FILL: 0.22,
  /** Same mix, deeper, so a press reads without changing the control's shape. */
  FILL_PRESSED: 0.35,
  /** Hue over the resting fill. */
  BORDER: 0.35,
} as const;

/**
 * Resolve a tonal control surface for a hue against an elevation surface.
 *
 * @param surface - The elevation colour the control sits on (usually `elevation2`)
 * @param hue - The control's colour (tint, error, a grade colour…)
 * @param pressed - Deepen the fill for the pressed state
 */
export function tonalSurface(
  surface: string,
  hue: string,
  pressed = false,
): { backgroundColor: string; borderColor: string } {
  return {
    backgroundColor: mixColors(
      surface,
      hue,
      pressed ? TONAL_SURFACE.FILL_PRESSED : TONAL_SURFACE.FILL,
    ),
    borderColor: withAlpha(hue, TONAL_SURFACE.BORDER),
  };
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

/**
 * `record` with `fn` applied to each value, keys (and their order) kept — typed
 * per key, which `Object.fromEntries` is not.
 */
function mapValues<T extends Record<string, unknown>, R>(
  record: T,
  fn: (value: T[keyof T]) => R,
): { [K in keyof T]: R } {
  const result = {} as { [K in keyof T]: R };
  for (const key of Object.keys(record) as (keyof T)[]) {
    result[key] = fn(record[key]);
  }
  return result;
}

/** One OKLCH colour as hex. */
const toHex = (color: OKLCHColor): string => oklchToHex(color.l, color.c, color.h);

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
  return mapValues(palette, toHex);
}

/**
 * Convert a palette nested one level deeper to hex values — each entry is
 * itself a flat palette. Handles both nestings the theme uses:
 *
 * - grammarOKLCH, where each colour has light/dark/sepia variants
 *   (`{ golden: { light, dark, sepia }, ... }`)
 * - textHierarchyOKLCH, where each theme has its text levels
 *   (`{ light: { subtitle, metadata }, dark: {...}, sepia: {...} }`)
 *
 * @example
 * const grammar = convertNestedPalette(grammarOKLCH);
 * // Result: { golden: { light: "#...", dark: "#...", sepia: "#..." }, ... }
 */
export function convertNestedPalette<T extends Record<string, Record<string, OKLCHColor>>>(
  palette: T,
): { [K in keyof T]: { [L in keyof T[K]]: string } } {
  return mapValues(palette, convertFlatPalette) as {
    [K in keyof T]: { [L in keyof T[K]]: string };
  };
}
