import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { ChartColors } from '@/types/ui/chart.types';
import { mixColors } from '@/utils/colorUtils';

/**
 * Unified Chart Color System for Vocabulary Analytics
 *
 * - One vivid azure accent (`chartAccent`) carries all data ink: lines,
 *   points, sparklines, cursors. Status colors (success/info/warning/error)
 *   appear only where color means good/bad (gauge fill, retention zones).
 * - Separation comes from crisp geometry and low-opacity washes,
 *   never from glows or gradient stacks.
 * - Fully theme-aware (light/dark/sepia) via semantic tokens.
 */

// Refined opacity levels for data visualization. Every step here is in use —
// an unused one is worse than clutter in a palette, because the next chart
// reaches for it as though it were part of a system that no longer exists.
// `SUBTLE` ("light overlay for zones") outlived the performance zones by a
// whole refactor and was the last thing in the file still naming them.
export const CHART_OPACITY = {
  HIGH: 0.85, // Strong presence for important data
  MEDIUM: 0.65, // Balanced visibility for secondary data
  LOW: 0.35, // Subtle presence for background elements
  ZONE: 0.18, // Band washes behind a plotted range (crisp, no blur)
  TRACK: 0.16, // Gauge/bar track washes — lighter step of the fill's own hue
} as const;

/**
 * The track a meter's fill runs in: a lighter step of the fill's OWN hue, mixed
 * against the surface the meter sits on.
 *
 * Mixed, never alpha-washed. An alpha wash composites toward whatever is behind
 * it, which on the dark theme is near-black — so the track turns into a smudge
 * instead of a lighter azure, and on sepia (whose accent clamps to a much lower
 * chroma against warm paper) it disappears entirely.
 *
 * The rule used to be written out at three call sites, against three different
 * surfaces and at two different weights. The SURFACE is legitimately per-caller
 * — a dictionary row, a sheet row and a card are not the same ground — so it
 * stays a parameter; the rule itself is here once.
 *
 * @param surface The colour the meter is drawn on (`colors.card`, `elevation1`, …)
 * @param fill    The meter's own fill colour
 * @param weight  How far to step off the surface. `TRACK` for a meter behind a
 *                fill; `ZONE` where the track is the only thing drawn and has to
 *                survive sepia on its own.
 */
export const getMeterTrackColor = (
  surface: string,
  fill: string,
  weight: number = CHART_OPACITY.TRACK,
): string => mixColors(surface, fill, weight);

/**
 * Pure function to get theme-aware chart colors
 * Used by components rendering inside Skia Canvas (no Context access)
 */
export const getChartColors = (colors: ThemeColors): ChartColors => {
  return {
    // Chart UI elements - optimized for data visualization contrast
    ui: {
      grid: colors.chartGrid, // Consistent subtle grid lines
      accent: colors.chartAccent, // Vivid azure for interactive elements
      dataLine: colors.chartAccent, // All data lines use the chart accent
      threshold: colors.chartThreshold, // Reference lines for targets
    },

    // Data point colors - accent dot with a card-colored surface ring
    dataPoint: {
      primary: colors.chartAccent,
      inner: colors.card, // Surface ring so points stay legible on the line
    },
  };
};

/**
 * Hook to get theme-aware chart colors
 * For components outside Skia Canvas (hooks, business logic)
 * Components inside Skia should use getChartColors() directly
 */
export const useChartColors = (): ChartColors => {
  const colors = useColors();
  return getChartColors(colors);
};
