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

// Refined opacity levels for data visualization
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.85, // Strong presence for important data
  MEDIUM: 0.65, // Balanced visibility for secondary data
  LOW: 0.35, // Subtle presence for background elements
  ZONE_DARK: 0.24, // Performance zone bands on dark surfaces
  ZONE: 0.18, // Performance zone bands (crisp, no blur)
  TRACK: 0.16, // Gauge/bar track washes — lighter step of the fill's own hue
  SUBTLE: 0.15, // Light overlay for zones
  WASH: 0.1, // Flat area fill under the data line
  MINIMAL: 0.08, // Very subtle grid lines
} as const;

/**
 * Pure function to get theme-aware chart colors
 * Used by components rendering inside Skia Canvas (no Context access)
 */
export const getChartColors = (colors: ThemeColors): ChartColors => {
  return {
    // Performance levels - status colors reserved for good/bad meaning
    performance: {
      excellent: colors.success, // Green - universally positive
      good: colors.info, // Blue (not sage) - calm, stable, distinct from green
      moderate: colors.warning, // Orange/Gold - caution
      poor: colors.error, // Red - attention needed
    },

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
