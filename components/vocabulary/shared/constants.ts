import { LAYOUT, useScreenWidth } from '@/constants/layout';
import { CRITICAL_RETRIEVABILITY_THRESHOLD } from '@/constants/fsrs';

// Graph dimensions - optimized for perfect alignment and space usage
export const useGraphWidth = (): number => {
  const screenWidth = useScreenWidth();
  // Add extra padding for x-axis labels: labels are 32px wide and centered on data points,
  // so the rightmost label extends 16px beyond the last data point
  const X_AXIS_LABEL_PADDING = 16;
  return (
    screenWidth -
    LAYOUT.SCREEN_EDGE_PADDING * 2 -
    LAYOUT.CARD.PADDING.MEDIUM * 2 -
    32 -
    X_AXIS_LABEL_PADDING
  );
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

// Standardized performance thresholds used across all charts
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// Standardized chart layout constants for consistent alignment
export const CHART_LAYOUT = {
  // Card content padding - consistent across all charts
  CONTENT_PADDING: LAYOUT.CARD.PADDING.MEDIUM, // 12px

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;
