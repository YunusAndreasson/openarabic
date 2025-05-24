import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Chart Color System for Vocabulary Analytics
 *
 * This system provides consistent, semantically meaningful colors across all charts.
 * Colors are designed for optimal UI/UX with accessibility considerations.
 */

// Core semantic color palette - these represent consistent meanings across all charts
export const CHART_COLORS = {
  // Performance levels (consistent across all performance metrics)
  EXCELLENT: '#10B981', // Emerald green - top performance, mastery, high efficiency
  GOOD: '#3B82F6', // Blue - good performance, moderate activity
  MODERATE: '#F59E0B', // Amber - moderate performance, needs attention
  POOR: '#EF4444', // Red - poor performance, critical issues

  // Activity levels (for activity and engagement metrics)
  HIGH_ACTIVITY: '#10B981', // Same as excellent for consistency
  MEDIUM_ACTIVITY: '#3B82F6', // Same as good for consistency
  LOW_ACTIVITY: '#F59E0B', // Same as moderate for consistency
  NO_ACTIVITY: '#94A3B8', // Slate gray - neutral, inactive

  // Memory and retention states
  STRONG_MEMORY: '#10B981', // Green - strong retention, safe zone
  FADING_MEMORY: '#F59E0B', // Amber - at risk, needs review
  WEAK_MEMORY: '#EF4444', // Red - critical, urgent review needed

  // Difficulty levels
  EASY: '#10B981', // Green - easy words, low difficulty
  MEDIUM: '#F59E0B', // Amber - medium difficulty
  HARD: '#EF4444', // Red - hard words, high difficulty

  // Trend indicators
  IMPROVING: '#10B981', // Green - positive trend
  STABLE: '#3B82F6', // Blue - stable trend
  DECLINING: '#EF4444', // Red - negative trend

  // UI elements
  BACKGROUND: '#F8FAFC', // Very light gray - chart backgrounds
  GRID: '#E2E8F0', // Light gray - grid lines
  BORDER: '#CBD5E1', // Medium gray - borders
  ACCENT: '#8B5CF6', // Purple - highlights, special elements

  // Neutral tones
  NEUTRAL_LIGHT: '#F1F5F9', // Very light - empty states
  NEUTRAL_MEDIUM: '#64748B', // Medium - secondary text
  NEUTRAL_DARK: '#334155', // Dark - primary text
} as const;

// Opacity levels for consistent transparency
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.3,
  SUBTLE: 0.15,
  MINIMAL: 0.05,
} as const;

/**
 * Hook to get theme-aware chart colors
 * Adapts the color system to light/dark themes while maintaining semantic consistency
 */
export const useChartColors = () => {
  const colors = useColors();

  return {
    // Performance levels - consistent semantic meaning
    performance: {
      excellent: colors.success, // Use theme success color
      good: colors.info, // Use theme info color
      moderate: colors.warning, // Use theme warning color
      poor: colors.error, // Use theme error color
    },

    // Activity levels - same as performance for consistency
    activity: {
      high: colors.success,
      medium: colors.info,
      low: colors.warning,
      none: withOpacity(colors.textTertiary, CHART_OPACITY.LOW),
    },

    // Memory retention states
    memory: {
      strong: colors.success, // Safe zone
      fading: colors.warning, // At risk
      weak: colors.error, // Critical
    },

    // Difficulty levels
    difficulty: {
      easy: colors.success,
      medium: colors.warning,
      hard: colors.error,
    },

    // Trend indicators
    trend: {
      improving: colors.success,
      stable: colors.info,
      declining: colors.error,
    },

    // Streak and consistency
    streak: {
      active: colors.success, // Active day
      inactive: withOpacity(colors.textTertiary, CHART_OPACITY.SUBTLE),
      today: colors.tint, // Today's border
    },

    // Chart UI elements - theme-aware
    ui: {
      background: withOpacity(colors.background, CHART_OPACITY.MEDIUM),
      grid: withOpacity(colors.textTertiary, CHART_OPACITY.MINIMAL),
      border: withOpacity(colors.border, CHART_OPACITY.HIGH),
      accent: colors.tint,
      shadow: withOpacity(colors.shadow, CHART_OPACITY.LOW),
    },

    // Gradients for area charts
    gradients: {
      excellent: [
        withOpacity(colors.success, CHART_OPACITY.MEDIUM),
        withOpacity(colors.success, CHART_OPACITY.SUBTLE),
        withOpacity(colors.success, CHART_OPACITY.MINIMAL),
      ],
      good: [
        withOpacity(colors.info, CHART_OPACITY.MEDIUM),
        withOpacity(colors.info, CHART_OPACITY.SUBTLE),
        withOpacity(colors.info, CHART_OPACITY.MINIMAL),
      ],
      warning: [
        withOpacity(colors.warning, CHART_OPACITY.MEDIUM),
        withOpacity(colors.warning, CHART_OPACITY.SUBTLE),
        withOpacity(colors.warning, CHART_OPACITY.MINIMAL),
      ],
      error: [
        withOpacity(colors.error, CHART_OPACITY.MEDIUM),
        withOpacity(colors.error, CHART_OPACITY.SUBTLE),
        withOpacity(colors.error, CHART_OPACITY.MINIMAL),
      ],
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Get color by performance level (0-100)
    getPerformanceColor: (value: number) => {
      if (value >= 80) return colors.success;
      if (value >= 60) return colors.info;
      if (value >= 40) return colors.warning;
      return colors.error;
    },

    // Get color by difficulty level (0-1)
    getDifficultyColor: (difficulty: number) => {
      if (difficulty < 0.5) return colors.success;
      if (difficulty < 0.7) return colors.warning;
      return colors.error;
    },

    // Get color by retrievability level (0-1)
    getRetrievabilityColor: (retrievability: number) => {
      if (retrievability >= 0.7) return colors.success;
      if (retrievability >= 0.5) return colors.warning;
      return colors.error;
    },
  };
};

/**
 * Color mapping for specific chart types
 * Provides consistent color schemes for different visualization types
 */
export const CHART_COLOR_SCHEMES = {
  // Activity chart - 4 levels
  ACTIVITY_LEVELS: {
    high: CHART_COLORS.HIGH_ACTIVITY,
    medium: CHART_COLORS.MEDIUM_ACTIVITY,
    low: CHART_COLORS.LOW_ACTIVITY,
    none: CHART_COLORS.NO_ACTIVITY,
  },

  // Mastery progression - 3 zones
  MASTERY_ZONES: {
    mastered: CHART_COLORS.EXCELLENT,
    learning: CHART_COLORS.GOOD,
    new: CHART_COLORS.MODERATE,
  },

  // Efficiency levels - 3 zones
  EFFICIENCY_ZONES: {
    excellent: CHART_COLORS.EXCELLENT,
    good: CHART_COLORS.GOOD,
    needsImprovement: CHART_COLORS.POOR,
  },

  // Retrievability zones - 3 zones
  RETRIEVABILITY_ZONES: {
    safe: CHART_COLORS.STRONG_MEMORY,
    atRisk: CHART_COLORS.FADING_MEMORY,
    critical: CHART_COLORS.WEAK_MEMORY,
  },

  // Difficulty distribution - 3 levels
  DIFFICULTY_LEVELS: {
    easy: CHART_COLORS.EASY,
    medium: CHART_COLORS.MEDIUM,
    hard: CHART_COLORS.HARD,
  },
} as const;

export type ChartColorScheme = keyof typeof CHART_COLOR_SCHEMES;
export type PerformanceLevel = 'excellent' | 'good' | 'moderate' | 'poor';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'none';
export type MemoryState = 'strong' | 'fading' | 'weak';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TrendDirection = 'improving' | 'stable' | 'declining';
