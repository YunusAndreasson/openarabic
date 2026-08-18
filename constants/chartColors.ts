import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { ChartColors } from '@/types/ui/chart.types';
import { withOpacity } from '@/utils/colorUtils';

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
  WASH: 0.1, // Flat area fill under the data line
} as const;

/**
 * Pure function to get theme-aware chart colors
 * Used by components rendering inside Skia Canvas (no Context access)
 */
export const getChartColors = (colors: ThemeColors): ChartColors => {
  return {
    // Chart UI elements - optimized for data visualization contrast
    ui: {
      background: colors.background,
      grid: colors.chartGrid, // Consistent subtle grid lines
      border: withOpacity(colors.border, CHART_OPACITY.HIGH),
      accent: colors.chartAccent, // Vivid azure for interactive elements
      dataLine: colors.chartAccent, // All data lines use the chart accent
      shadow: withOpacity(colors.shadow, CHART_OPACITY.LOW),
      tooltip: withOpacity(colors.card, 0.98),
      threshold: colors.chartThreshold, // Reference lines for targets
    },

    // Data point colors - accent dot with a card-colored surface ring
    dataPoint: {
      primary: colors.chartAccent,
      inner: colors.card, // Surface ring so points stay legible on the line
    },

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Flat low-opacity wash under the data line (no gradient, no blur)
    areaWash: withOpacity(colors.chartAccent, CHART_OPACITY.WASH),
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
