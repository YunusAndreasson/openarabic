import { Dimensions } from 'react-native';

import { LAYOUT } from '@/constants/layout';

// Graph dimensions - calculated dynamically to avoid unused constants
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const GRAPH_WIDTH =
  SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
export const GRAPH_HEIGHT_LARGE = 140;

// Time periods
export const DAYS_14 = 14;

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

  // Graph container margins - eliminates conflicting margins
  GRAPH_MARGIN_HORIZONTAL: 0, // No horizontal margin for perfect alignment
  GRAPH_MARGIN_VERTICAL: LAYOUT.SPACING.SMALL, // 8px top/bottom

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;
