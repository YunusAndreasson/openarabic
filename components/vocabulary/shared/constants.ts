import { LAYOUT, useScreenWidth } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage
export const useGraphWidth = (): number => {
  const screenWidth = useScreenWidth();
  return screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2 - 32;
};
export const GRAPH_HEIGHT_LARGE = 176; // Optimized height for better proportions (8px alignment grid)

// Chart visual constants for perfect alignment
export const CHART_VISUAL = {
  DATA_POINT_SIZE: 3.5, // Primary data point radius
  DATA_POINT_INNER_SIZE: 2, // Inner highlight radius
  MILESTONE_SIZE: 4, // Milestone indicator radius
  MILESTONE_INNER_SIZE: 2.5, // Milestone inner radius
  LINE_WIDTH: 2.5, // Chart line stroke width
  GRID_OPACITY: 0.06, // Subtle grid line opacity
  CHART_TOP_PADDING: 8, // Top padding for data points (aligned to 8px grid)
} as const;

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load

// FSRS thresholds - aligned with FSRS algorithm standards
export const MASTERY_STABILITY_THRESHOLD = 5; // Days - minimum stability for mastery
export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7; // 70% - threshold for review urgency

// Standardized performance thresholds used across all charts
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// FSRS difficulty thresholds (corrected for actual 0-1 scale)
export const FSRS_DIFFICULTY_THRESHOLDS = {
  EASY: 0.65, // Below 65% difficulty = Easy
  MEDIUM: 0.8, // 65-80% difficulty = Medium, 80%+ = Hard/Struggling
} as const;

// Standardized chart layout constants for consistent alignment
export const CHART_LAYOUT = {
  // Card content padding - consistent across all charts
  CONTENT_PADDING: LAYOUT.CARD.PADDING.MEDIUM, // 12px

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;
