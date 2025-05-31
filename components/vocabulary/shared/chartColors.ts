import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { PERFORMANCE_THRESHOLDS, FSRS_DIFFICULTY_THRESHOLDS } from './constants';

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
export const useChartColors = () => {
  const colors = useColors();

  return {
    // Performance levels - using distinct hues for clear differentiation
    performance: {
      excellent: colors.success, // Green - universally positive
      good: colors.info, // Blue - calm, stable
      moderate: colors.warning, // Orange/Gold - caution
      poor: colors.error, // Red - attention needed
    },

    // Activity levels - using the primary color with varying intensities
    activity: {
      high: colors.tint, // Bright primary - high energy
      medium: colors.info, // Blue - steady activity
      low: colors.warning, // Orange - gentle activity
      none: withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM),
    },

    // Memory retention states - using temperature-based color psychology
    memory: {
      strong: colors.success, // Green - healthy, strong
      fading: colors.warning, // Orange - transitional state
      weak: colors.error, // Red - needs attention
    },

    // Difficulty levels - using intensity progression
    difficulty: {
      easy: colors.success, // Green - easy/positive
      medium: colors.warning, // Orange - moderate challenge
      hard: colors.error, // Red - difficult/challenging
    },

    // Trend indicators - directional color psychology
    trend: {
      improving: colors.success, // Green - positive direction
      stable: colors.info, // Blue - steady state
      declining: colors.error, // Red - negative direction
    },

    // Streak and consistency - using primary brand colors
    streak: {
      active: colors.tint, // Bright primary - active engagement
      inactive: withOpacity(colors.textTertiary, CHART_OPACITY.LOW),
      today: colors.primary, // Primary brand color for current day
      weekend: withOpacity(colors.warning, CHART_OPACITY.MEDIUM),
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

    // Get subtle glow colors for enhanced data point visibility
    getDataPointGlow: (type: 'efficiency' | 'mastery' | 'retrievability' = 'efficiency') => {
      switch (type) {
        case 'efficiency':
          return withOpacity(colors.info, 0.4);
        case 'mastery':
          return withOpacity(colors.success, 0.35);
        case 'retrievability':
          return withOpacity(colors.info, 0.4);
      }
    },

    // Enhanced color selection functions with standardized thresholds
    getPerformanceColor: (value: number) => {
      if (value >= PERFORMANCE_THRESHOLDS.EXCELLENT) return colors.success;
      if (value >= PERFORMANCE_THRESHOLDS.GOOD) return colors.info;
      if (value >= PERFORMANCE_THRESHOLDS.FAIR) return colors.warning;
      return colors.error;
    },

    getDifficultyColor: (difficulty: number) => {
      // FSRS difficulty ranges ~5-10, using validated thresholds
      if (difficulty < FSRS_DIFFICULTY_THRESHOLDS.EASY) return colors.success;
      if (difficulty < FSRS_DIFFICULTY_THRESHOLDS.MEDIUM) return colors.warning;
      return colors.error;
    },

    getRetrievabilityColor: (retrievability: number) => {
      // Convert to percentage and use standardized thresholds
      const percentage = retrievability * 100;
      if (percentage >= PERFORMANCE_THRESHOLDS.EXCELLENT) return colors.success;
      if (percentage >= PERFORMANCE_THRESHOLDS.GOOD) return colors.info;
      if (percentage >= PERFORMANCE_THRESHOLDS.FAIR) return colors.warning;
      return colors.error;
    },
  };
};

export type PerformanceLevel = 'excellent' | 'good' | 'moderate' | 'poor';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'none';
export type MemoryState = 'strong' | 'fading' | 'weak';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type MasteryLevel = 'mastered' | 'proficient' | 'learning' | 'new';
