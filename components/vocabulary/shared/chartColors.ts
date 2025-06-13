import { useColors } from '@/hooks/theme/useColors';
import type { ChartColors } from '@/types/ui/chart.types';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Data Visualization Color System for Vocabulary Analytics
 *
 * This system applies color theory principles for optimal data visualization:
 * - High contrast against backgrounds for accessibility
 * - Complementary color relationships for visual separation
 * - Proper saturation levels for data prominence
 * - Semantic color mapping that works across themes
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
 * Hook to get theme-aware chart colors optimized for data visualization
 * Uses color theory principles for maximum clarity and visual hierarchy
 */
export const useChartColors = (): ChartColors => {
  const colors = useColors();

  return {
    // Performance levels - using distinct hues for clear differentiation
    performance: {
      excellent: colors.success, // Green - universally positive
      good: colors.info, // Blue - calm, stable
      moderate: colors.warning, // Orange/Gold - caution
      poor: colors.error, // Red - attention needed
    },

    // Chart UI elements - optimized for data visualization contrast
    ui: {
      background: colors.background,
      grid: withOpacity(colors.textTertiary, CHART_OPACITY.MINIMAL), // Subtle grid
      border: withOpacity(colors.border, CHART_OPACITY.HIGH),
      accent: colors.tint, // Bright primary for main data lines
      dataLine: colors.info, // Blue for neutral data representation
      shadow: withOpacity(colors.shadow, CHART_OPACITY.LOW),
      tooltip: withOpacity(colors.card, 0.98),
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Get polished area fill gradients for data visualization
    getAreaFillGradient: (type: 'efficiency' | 'mastery' | 'retrievability' = 'efficiency') => {
      const baseColor = colors.info;

      switch (type) {
        case 'efficiency':
          return [
            withOpacity(baseColor, 0.7), // Strong at top
            withOpacity(baseColor, 0.4), // Medium in middle
            withOpacity(baseColor, 0.15), // Subtle at middle-bottom
            withOpacity(baseColor, 0.05), // Very subtle at bottom
          ];
        case 'mastery':
          return [
            withOpacity(colors.success, 0.6), // Success color for mastery
            withOpacity(colors.success, 0.35),
            withOpacity(colors.success, 0.12),
            withOpacity(colors.success, 0.03),
          ];
        case 'retrievability':
          return [
            withOpacity(colors.info, 0.65), // Info color for memory
            withOpacity(colors.info, 0.4),
            withOpacity(colors.info, 0.15),
            withOpacity(colors.info, 0.04),
          ];
      }
    },
  };
};
