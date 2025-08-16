import { useColors } from '@/hooks/theme/useColors';
import type { ChartColors } from '@/types/ui/chart.types';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Unified Chart Color System for Vocabulary Analytics
 *
 * This system provides visual cohesion across all charts:
 * - Single sage-green color family for all chart types
 * - Professional appearance like top analytics dashboards
 * - Reduced cognitive load - no color meaning to decode
 * - Perfect brand consistency with your sage-green theme
 */

// Refined opacity levels for data visualization
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.85, // Strong presence for important data
  MEDIUM: 0.65, // Balanced visibility for secondary data
  LOW: 0.35, // Subtle presence for background elements
  SUBTLE: 0.15, // Light overlay for zones
  MINIMAL: 0.08, // Very subtle grid lines
} as const;

/**
 * Hook to get theme-aware chart colors with unified sage-green system
 * All charts use the tint color directly for maximum simplicity
 */
export const useChartColors = (): ChartColors => {
  const colors = useColors();

  return {
    // Performance levels - using unified sage green system for visual cohesion
    performance: {
      excellent: colors.success, // Green - universally positive
      good: colors.info, // Blue - calm, stable
      moderate: colors.warning, // Orange/Gold - caution
      poor: colors.error, // Red - attention needed
    },

    // Chart UI elements - optimized for data visualization contrast
    ui: {
      background: colors.background,
      grid: colors.chartGrid, // Consistent subtle grid lines
      border: withOpacity(colors.border, CHART_OPACITY.HIGH),
      accent: colors.tint, // Bright primary for interactive elements
      dataLine: colors.tint, // All data lines use tint color
      shadow: withOpacity(colors.shadow, CHART_OPACITY.LOW),
      tooltip: withOpacity(colors.card, 0.98),
      threshold: colors.chartThreshold, // Reference lines for targets
    },

    // Data point colors - using brighter sage for better visibility
    dataPoint: {
      primary: colors.tint, // Brighter sage tint for better visibility
      inner: withOpacity(colors.tint, 0.7), // Slightly darker for inner highlight
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Get unified gradient for all chart types
    getAreaFillGradient: () => {
      return [
        withOpacity(colors.tint, 0.7), // Strong at top
        withOpacity(colors.tint, 0.4), // Medium in middle
        withOpacity(colors.tint, 0.15), // Subtle at middle-bottom
        withOpacity(colors.tint, 0.05), // Very subtle at bottom
      ];
    },
  };
};
