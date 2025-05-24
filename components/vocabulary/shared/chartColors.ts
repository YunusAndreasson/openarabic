import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Modern Chart Color System for Vocabulary Analytics
 *
 * This system provides a cohesive, modern color palette with excellent semantic clarity.
 * Colors are carefully chosen for optimal accessibility, visual harmony, and intuitive understanding.
 * The palette uses a sophisticated approach with complementary hues and consistent saturation levels.
 */

// Modern semantic color palette - carefully curated for visual harmony and clarity
export const CHART_COLORS = {
  // Performance levels - using a sophisticated green-to-red spectrum with modern hues
  EXCELLENT: '#06D6A0', // Modern teal-green - fresh, positive, achievement
  GOOD: '#118AB2', // Deep ocean blue - reliable, stable, good progress
  MODERATE: '#FFB627', // Warm amber - attention-grabbing but not alarming
  POOR: '#EF476F', // Modern coral-red - urgent but not harsh

  // Activity levels - using the same semantic colors for consistency
  HIGH_ACTIVITY: '#06D6A0', // Vibrant teal-green for high engagement
  MEDIUM_ACTIVITY: '#118AB2', // Steady blue for moderate activity
  LOW_ACTIVITY: '#FFB627', // Warm amber for low activity
  NO_ACTIVITY: '#8D99AE', // Sophisticated gray-blue for inactive states

  // Memory and retention states - optimized for cognitive understanding
  STRONG_MEMORY: '#06D6A0', // Fresh green - strong retention, confidence
  FADING_MEMORY: '#FFB627', // Warm amber - needs attention, not critical
  WEAK_MEMORY: '#EF476F', // Modern coral - urgent review needed

  // Difficulty levels - intuitive color progression
  EASY: '#06D6A0', // Green - easy, approachable
  MEDIUM: '#FFB627', // Amber - moderate challenge
  HARD: '#EF476F', // Coral - challenging, requires focus

  // Trend indicators - clear directional meaning
  IMPROVING: '#06D6A0', // Green - positive momentum
  STABLE: '#118AB2', // Blue - steady, consistent
  DECLINING: '#EF476F', // Coral - needs intervention

  // UI elements - modern, subtle, professional
  BACKGROUND: '#FAFBFC', // Ultra-light gray with slight blue tint
  GRID: '#E8ECEF', // Soft gray for subtle grid lines
  BORDER: '#D1D9E0', // Medium gray with blue undertone
  ACCENT: '#7209B7', // Modern purple - highlights and special elements

  // Neutral tones - sophisticated gray scale
  NEUTRAL_LIGHT: '#F4F6F8', // Very light - empty states, backgrounds
  NEUTRAL_MEDIUM: '#6C757D', // Medium - secondary text, icons
  NEUTRAL_DARK: '#2D3748', // Dark - primary text, important elements

  // Additional modern colors for variety
  SECONDARY_BLUE: '#4299E1', // Lighter blue for secondary elements
  SECONDARY_GREEN: '#48BB78', // Alternative green for variety
  SECONDARY_PURPLE: '#9F7AEA', // Softer purple for accents
  SECONDARY_ORANGE: '#ED8936', // Warm orange for highlights
} as const;

// Refined opacity levels for modern design
export const CHART_OPACITY = {
  SOLID: 1.0,
  HIGH: 0.85, // Slightly more opaque for better visibility
  MEDIUM: 0.65, // Balanced transparency
  LOW: 0.35, // Subtle presence
  SUBTLE: 0.18, // Very light overlay
  MINIMAL: 0.08, // Barely visible
} as const;

/**
 * Hook to get theme-aware chart colors with modern palette
 * Maintains semantic consistency while adapting to light/dark themes
 */
export const useChartColors = () => {
  const colors = useColors();

  return {
    // Performance levels - modern, intuitive color progression
    performance: {
      excellent: '#06D6A0', // Modern teal-green
      good: '#118AB2', // Deep ocean blue
      moderate: '#FFB627', // Warm amber
      poor: '#EF476F', // Modern coral
    },

    // Activity levels - consistent with performance for cognitive ease
    activity: {
      high: '#06D6A0',
      medium: '#118AB2',
      low: '#FFB627',
      none: withOpacity('#8D99AE', CHART_OPACITY.MEDIUM),
    },

    // Memory retention states - clear cognitive mapping
    memory: {
      strong: '#06D6A0', // Safe, confident
      fading: '#FFB627', // Caution, attention needed
      weak: '#EF476F', // Urgent, critical
    },

    // Difficulty levels - intuitive progression
    difficulty: {
      easy: '#06D6A0',
      medium: '#FFB627',
      hard: '#EF476F',
    },

    // Trend indicators - clear directional meaning
    trend: {
      improving: '#06D6A0',
      stable: '#118AB2',
      declining: '#EF476F',
    },

    // Streak and consistency - modern approach
    streak: {
      active: '#06D6A0', // Active day - vibrant green
      inactive: withOpacity('#8D99AE', CHART_OPACITY.SUBTLE),
      today: '#7209B7', // Today's border - distinctive purple
      weekend: withOpacity('#4299E1', CHART_OPACITY.LOW), // Weekend highlight
    },

    // Chart UI elements - modern, professional
    ui: {
      background: colors.background,
      grid: withOpacity('#8D99AE', CHART_OPACITY.MINIMAL),
      border: withOpacity('#D1D9E0', CHART_OPACITY.HIGH),
      accent: '#7209B7',
      shadow: withOpacity(colors.shadow, CHART_OPACITY.LOW),
      tooltip: withOpacity(colors.card, 0.95),
    },

    // Modern gradients for area charts and backgrounds
    gradients: {
      excellent: [
        withOpacity('#06D6A0', CHART_OPACITY.MEDIUM),
        withOpacity('#06D6A0', CHART_OPACITY.LOW),
        withOpacity('#06D6A0', CHART_OPACITY.MINIMAL),
      ],
      good: [
        withOpacity('#118AB2', CHART_OPACITY.MEDIUM),
        withOpacity('#118AB2', CHART_OPACITY.LOW),
        withOpacity('#118AB2', CHART_OPACITY.MINIMAL),
      ],
      warning: [
        withOpacity('#FFB627', CHART_OPACITY.MEDIUM),
        withOpacity('#FFB627', CHART_OPACITY.LOW),
        withOpacity('#FFB627', CHART_OPACITY.MINIMAL),
      ],
      error: [
        withOpacity('#EF476F', CHART_OPACITY.MEDIUM),
        withOpacity('#EF476F', CHART_OPACITY.LOW),
        withOpacity('#EF476F', CHART_OPACITY.MINIMAL),
      ],
      accent: [
        withOpacity('#7209B7', CHART_OPACITY.MEDIUM),
        withOpacity('#7209B7', CHART_OPACITY.LOW),
        withOpacity('#7209B7', CHART_OPACITY.MINIMAL),
      ],
    },

    // Opacity utilities
    opacity: CHART_OPACITY,

    // Helper functions
    withOpacity: (color: string, opacity: number) => withOpacity(color, opacity),

    // Enhanced color selection functions with modern palette
    getPerformanceColor: (value: number) => {
      if (value >= 85) return '#06D6A0'; // Excellent - modern teal
      if (value >= 70) return '#118AB2'; // Good - ocean blue
      if (value >= 50) return '#FFB627'; // Moderate - warm amber
      return '#EF476F'; // Poor - modern coral
    },

    // Get color by difficulty level (0-1) with refined thresholds
    getDifficultyColor: (difficulty: number) => {
      if (difficulty < 0.4) return '#06D6A0'; // Easy
      if (difficulty < 0.7) return '#FFB627'; // Medium
      return '#EF476F'; // Hard
    },

    // Get color by retrievability level (0-1) with optimized thresholds
    getRetrievabilityColor: (retrievability: number) => {
      if (retrievability >= 0.75) return '#06D6A0'; // Strong memory
      if (retrievability >= 0.5) return '#FFB627'; // Fading memory
      return '#EF476F'; // Weak memory
    },

    // Get color by mastery level with smooth progression
    getMasteryColor: (mastery: number) => {
      if (mastery >= 0.8) return '#06D6A0'; // Mastered
      if (mastery >= 0.5) return '#118AB2'; // Learning
      if (mastery >= 0.2) return '#FFB627'; // Practicing
      return '#8D99AE'; // New
    },

    // Get color for time-based data (hours studied, etc.)
    getTimeColor: (hours: number, maxHours: number) => {
      const ratio = hours / maxHours;
      if (ratio >= 0.8) return '#06D6A0'; // High activity
      if (ratio >= 0.5) return '#118AB2'; // Medium activity
      if (ratio >= 0.2) return '#FFB627'; // Low activity
      return withOpacity('#8D99AE', CHART_OPACITY.MEDIUM); // Minimal activity
    },
  };
};

/**
 * Modern color schemes for specific chart types
 * Provides consistent, beautiful color combinations for different visualizations
 */
export const CHART_COLOR_SCHEMES = {
  // Activity chart - 4 levels with modern progression
  ACTIVITY_LEVELS: {
    high: '#06D6A0', // Vibrant teal-green
    medium: '#118AB2', // Ocean blue
    low: '#FFB627', // Warm amber
    none: '#8D99AE', // Sophisticated gray
  },

  // Mastery progression - 4 zones for better granularity
  MASTERY_ZONES: {
    mastered: '#06D6A0', // Achieved - teal green
    proficient: '#118AB2', // Strong - ocean blue
    learning: '#FFB627', // Developing - amber
    new: '#8D99AE', // Starting - gray
  },

  // Efficiency levels - 3 clear zones
  EFFICIENCY_ZONES: {
    excellent: '#06D6A0', // High efficiency
    good: '#118AB2', // Moderate efficiency
    needsImprovement: '#EF476F', // Low efficiency
  },

  // Retrievability zones - 3 memory states
  RETRIEVABILITY_ZONES: {
    safe: '#06D6A0', // Strong memory
    atRisk: '#FFB627', // Fading memory
    critical: '#EF476F', // Weak memory
  },

  // Difficulty distribution - 3 intuitive levels
  DIFFICULTY_LEVELS: {
    easy: '#06D6A0', // Approachable green
    medium: '#FFB627', // Moderate amber
    hard: '#EF476F', // Challenging coral
  },

  // Study session types - varied but harmonious
  SESSION_TYPES: {
    review: '#118AB2', // Review sessions - steady blue
    learn: '#06D6A0', // Learning new - fresh green
    practice: '#FFB627', // Practice - active amber
    test: '#7209B7', // Testing - distinctive purple
  },

  // Progress indicators - motivational colors
  PROGRESS_INDICATORS: {
    ahead: '#06D6A0', // Ahead of schedule
    onTrack: '#118AB2', // On schedule
    behind: '#FFB627', // Behind schedule
    critical: '#EF476F', // Critically behind
  },
} as const;

export type ChartColorScheme = keyof typeof CHART_COLOR_SCHEMES;
export type PerformanceLevel = 'excellent' | 'good' | 'moderate' | 'poor';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'none';
export type MemoryState = 'strong' | 'fading' | 'weak';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type MasteryLevel = 'mastered' | 'proficient' | 'learning' | 'new';
export type SessionType = 'review' | 'learn' | 'practice' | 'test';
export type ProgressStatus = 'ahead' | 'onTrack' | 'behind' | 'critical';
