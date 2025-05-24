import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Refined Chart Color System for Vocabulary Analytics
 *
 * This system provides a cohesive, balanced color palette that seamlessly integrates with the app theme.
 * Colors are carefully chosen for optimal accessibility, visual harmony, and clear data communication.
 * The palette emphasizes subtlety and professionalism while maintaining excellent semantic clarity.
 * All colors are designed to work harmoniously in both light and dark themes.
 */

// Refined opacity levels for elegant, minimalistic design
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.75, // Slightly reduced for better balance
  MEDIUM: 0.45, // More refined transparency
  LOW: 0.2, // Subtle presence
  SUBTLE: 0.1, // Very light overlay
  MINIMAL: 0.05, // Barely visible
} as const;

/**
 * Hook to get theme-aware chart colors with refined palette
 * Maintains semantic consistency while perfectly adapting to light/dark themes
 */
export const useChartColors = () => {
  const colors = useColors();

  return {
    // Performance levels - refined, theme-consistent progression
    performance: {
      excellent: colors.success, // Use theme success color
      good: colors.info, // Use theme info color
      moderate: colors.warning, // Use theme warning color
      poor: colors.error, // Use theme error color
    },

    // Activity levels - consistent with performance for cognitive ease
    activity: {
      high: colors.success,
      medium: colors.info,
      low: colors.warning,
      none: withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM),
    },

    // Memory retention states - clear cognitive mapping using theme colors
    memory: {
      strong: colors.success, // Safe, confident
      fading: colors.warning, // Caution, attention needed
      weak: colors.error, // Urgent, critical
    },

    // Difficulty levels - intuitive progression with theme colors
    difficulty: {
      easy: colors.success,
      medium: colors.warning,
      hard: colors.error,
    },

    // Trend indicators - clear directional meaning
    trend: {
      improving: colors.success,
      stable: colors.info,
      declining: colors.error,
    },

    // Streak and consistency - refined, theme-aware approach
    streak: {
      active: colors.success, // Active day - success green
      inactive: withOpacity(colors.textTertiary, CHART_OPACITY.SUBTLE),
      today: colors.primary, // Today's border - theme primary (subtle)
      weekend: withOpacity(colors.info, CHART_OPACITY.SUBTLE), // Weekend highlight
    },

    // Chart UI elements - perfectly theme-integrated
    ui: {
      background: colors.background,
      grid: withOpacity(colors.textTertiary, CHART_OPACITY.MINIMAL),
      border: withOpacity(colors.border, CHART_OPACITY.HIGH),
      accent: colors.primary, // Use theme primary instead of strong purple
      shadow: withOpacity(colors.shadow, CHART_OPACITY.SUBTLE),
      tooltip: withOpacity(colors.card, 0.98),
    },

    // Refined gradients for area charts - more subtle and elegant
    gradients: {
      excellent: [
        withOpacity(colors.success, CHART_OPACITY.MEDIUM),
        withOpacity(colors.success, CHART_OPACITY.LOW),
        withOpacity(colors.success, CHART_OPACITY.SUBTLE),
      ],
      good: [
        withOpacity(colors.info, CHART_OPACITY.MEDIUM),
        withOpacity(colors.info, CHART_OPACITY.LOW),
        withOpacity(colors.info, CHART_OPACITY.SUBTLE),
      ],
      warning: [
        withOpacity(colors.warning, CHART_OPACITY.MEDIUM),
        withOpacity(colors.warning, CHART_OPACITY.LOW),
        withOpacity(colors.warning, CHART_OPACITY.SUBTLE),
      ],
      error: [
        withOpacity(colors.error, CHART_OPACITY.MEDIUM),
        withOpacity(colors.error, CHART_OPACITY.LOW),
        withOpacity(colors.error, CHART_OPACITY.SUBTLE),
      ],
      accent: [
        withOpacity(colors.primary, CHART_OPACITY.MEDIUM),
        withOpacity(colors.primary, CHART_OPACITY.LOW),
        withOpacity(colors.primary, CHART_OPACITY.SUBTLE),
      ],
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Enhanced color selection functions with theme-aware colors
    getPerformanceColor: (value: number) => {
      if (value >= 85) return colors.success; // Excellent
      if (value >= 70) return colors.info; // Good
      if (value >= 50) return colors.warning; // Moderate
      return colors.error; // Poor
    },

    // Get color by difficulty level (0-1) with refined thresholds
    getDifficultyColor: (difficulty: number) => {
      if (difficulty < 0.4) return colors.success; // Easy
      if (difficulty < 0.7) return colors.warning; // Medium
      return colors.error; // Hard
    },

    // Get color by retrievability level (0-1) with optimized thresholds
    getRetrievabilityColor: (retrievability: number) => {
      if (retrievability >= 0.75) return colors.success; // Strong memory
      if (retrievability >= 0.5) return colors.warning; // Fading memory
      return colors.error; // Weak memory
    },

    // Get color by mastery level with smooth progression
    getMasteryColor: (mastery: number) => {
      if (mastery >= 0.8) return colors.success; // Mastered
      if (mastery >= 0.5) return colors.info; // Learning
      if (mastery >= 0.2) return colors.warning; // Practicing
      return withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM); // New
    },

    // Get color for time-based data (hours studied, etc.)
    getTimeColor: (hours: number, maxHours: number) => {
      const ratio = hours / maxHours;
      if (ratio >= 0.8) return colors.success; // High activity
      if (ratio >= 0.5) return colors.info; // Medium activity
      if (ratio >= 0.2) return colors.warning; // Low activity
      return withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM); // Minimal activity
    },
  };
};

export type PerformanceLevel = 'excellent' | 'good' | 'moderate' | 'poor';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'none';
export type MemoryState = 'strong' | 'fading' | 'weak';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type MasteryLevel = 'mastered' | 'proficient' | 'learning' | 'new';
export type SessionType = 'review' | 'learn' | 'practice' | 'test';
export type ProgressStatus = 'ahead' | 'onTrack' | 'behind' | 'critical';
