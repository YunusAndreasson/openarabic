import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Natural & Organic Chart Color System for Vocabulary Analytics
 *
 * This refined system provides a harmonious, earth-inspired color palette that seamlessly integrates
 * with the app's natural green undertones and warm gold/brown complementary colors.
 * Colors are carefully chosen for optimal accessibility, visual harmony, and clear data communication.
 * The palette emphasizes organic sophistication while maintaining excellent semantic clarity.
 * All colors work beautifully in both light and dark themes with natural warmth.
 */

// Refined opacity levels for elegant, organic design
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.75, // Balanced for natural depth
  MEDIUM: 0.45, // Organic transparency
  LOW: 0.2, // Subtle earth presence
  SUBTLE: 0.1, // Natural overlay
  MINIMAL: 0.05, // Barely visible like morning mist
} as const;

/**
 * Hook to get theme-aware chart colors with natural, organic palette
 * Maintains semantic consistency while perfectly adapting to the earth-inspired theme
 */
export const useChartColors = () => {
  const colors = useColors();

  return {
    // Performance levels - natural, earth-inspired progression
    performance: {
      excellent: colors.success, // Sage green - natural mastery
      good: colors.info, // Muted blue-gray - calm progress
      moderate: colors.warning, // Warm gold - organic caution
      poor: colors.error, // Terracotta - natural urgency
    },

    // Activity levels - consistent with natural performance mapping
    activity: {
      high: colors.success, // Sage green - thriving growth
      medium: colors.info, // Muted blue-gray - steady flow
      low: colors.warning, // Warm gold - gentle reminder
      none: withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM), // Natural dormancy
    },

    // Memory retention states - organic cognitive mapping
    memory: {
      strong: colors.success, // Sage green - rooted knowledge
      fading: colors.warning, // Warm gold - autumn transition
      weak: colors.error, // Terracotta - needs nurturing
    },

    // Difficulty levels - natural progression like terrain
    difficulty: {
      easy: colors.success, // Sage green - gentle meadow
      medium: colors.warning, // Warm gold - rolling hills
      hard: colors.error, // Terracotta - mountain peaks
    },

    // Trend indicators - natural directional flow
    trend: {
      improving: colors.success, // Sage green - spring growth
      stable: colors.info, // Muted blue-gray - steady river
      declining: colors.error, // Terracotta - autumn leaves
    },

    // Streak and consistency - natural rhythm and cycles
    streak: {
      active: colors.success, // Sage green - living day
      inactive: withOpacity(colors.textTertiary, CHART_OPACITY.SUBTLE), // Dormant earth
      today: colors.primary, // Current moment - warm presence
      weekend: withOpacity(colors.warning, CHART_OPACITY.LOW), // Golden weekend glow
    },

    // Chart UI elements - perfectly integrated with natural theme
    ui: {
      background: colors.background,
      grid: withOpacity(colors.textTertiary, CHART_OPACITY.MINIMAL), // Subtle like morning dew
      border: withOpacity(colors.border, CHART_OPACITY.HIGH), // Natural boundaries
      accent: colors.primary, // Warm earth accent
      shadow: withOpacity(colors.shadow, CHART_OPACITY.SUBTLE), // Natural depth
      tooltip: withOpacity(colors.card, 0.98), // Organic tooltip surface
    },

    // Natural gradients for area charts - earth-inspired transitions
    gradients: {
      excellent: [
        withOpacity(colors.success, CHART_OPACITY.MEDIUM), // Sage green fade
        withOpacity(colors.success, CHART_OPACITY.LOW),
        withOpacity(colors.success, CHART_OPACITY.SUBTLE),
      ],
      good: [
        withOpacity(colors.info, CHART_OPACITY.MEDIUM), // Muted blue-gray fade
        withOpacity(colors.info, CHART_OPACITY.LOW),
        withOpacity(colors.info, CHART_OPACITY.SUBTLE),
      ],
      warning: [
        withOpacity(colors.warning, CHART_OPACITY.MEDIUM), // Warm gold fade
        withOpacity(colors.warning, CHART_OPACITY.LOW),
        withOpacity(colors.warning, CHART_OPACITY.SUBTLE),
      ],
      error: [
        withOpacity(colors.error, CHART_OPACITY.MEDIUM), // Terracotta fade
        withOpacity(colors.error, CHART_OPACITY.LOW),
        withOpacity(colors.error, CHART_OPACITY.SUBTLE),
      ],
      accent: [
        withOpacity(colors.primary, CHART_OPACITY.MEDIUM), // Natural earth fade
        withOpacity(colors.primary, CHART_OPACITY.LOW),
        withOpacity(colors.primary, CHART_OPACITY.SUBTLE),
      ],
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Enhanced color selection functions with natural, organic thresholds
    getPerformanceColor: (value: number) => {
      if (value >= 85) return colors.success; // Sage green - excellent mastery
      if (value >= 70) return colors.info; // Muted blue-gray - good progress
      if (value >= 50) return colors.warning; // Warm gold - moderate effort
      return colors.error; // Terracotta - needs attention
    },

    // Get color by difficulty level (0-1) with natural thresholds
    getDifficultyColor: (difficulty: number) => {
      if (difficulty < 0.4) return colors.success; // Sage green - easy terrain
      if (difficulty < 0.7) return colors.warning; // Warm gold - moderate climb
      return colors.error; // Terracotta - challenging peak
    },

    // Get color by retrievability level (0-1) with organic memory mapping
    getRetrievabilityColor: (retrievability: number) => {
      if (retrievability >= 0.75) return colors.success; // Sage green - deeply rooted
      if (retrievability >= 0.5) return colors.warning; // Warm gold - seasonal memory
      return colors.error; // Terracotta - needs cultivation
    },

    // Get color for mastery level with natural growth progression
    getMasteryColor: (mastery: number) => {
      if (mastery >= 0.8) return colors.success; // Sage green - mature tree
      if (mastery >= 0.5) return colors.info; // Muted blue-gray - growing sapling
      if (mastery >= 0.2) return colors.warning; // Warm gold - young sprout
      return withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM); // Dormant seed
    },

    // Get color for time-based data with natural activity rhythms
    getTimeColor: (hours: number, maxHours: number) => {
      const ratio = hours / maxHours;
      if (ratio >= 0.8) return colors.success; // Sage green - abundant growth
      if (ratio >= 0.5) return colors.info; // Muted blue-gray - steady flow
      if (ratio >= 0.2) return colors.warning; // Warm gold - gentle activity
      return withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM); // Natural rest
    },

    // Additional natural color helpers for organic data visualization
    getSeasonalColor: (season: 'spring' | 'summer' | 'autumn' | 'winter') => {
      switch (season) {
        case 'spring':
          return colors.success; // Sage green - new growth
        case 'summer':
          return colors.info; // Muted blue-gray - steady warmth
        case 'autumn':
          return colors.warning; // Warm gold - harvest time
        case 'winter':
          return withOpacity(colors.textTertiary, CHART_OPACITY.HIGH); // Dormant earth
      }
    },

    // Natural element colors for thematic consistency
    elements: {
      earth: colors.warning, // Warm gold - rich soil
      water: colors.info, // Muted blue-gray - flowing stream
      growth: colors.success, // Sage green - living plants
      fire: colors.error, // Terracotta - warm hearth
      air: withOpacity(colors.textTertiary, CHART_OPACITY.MEDIUM), // Light breeze
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
