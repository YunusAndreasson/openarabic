import { Dimensions } from 'react-native';

import { LAYOUT } from '@/constants/layout';

// Graph dimensions - calculated dynamically to avoid unused constants
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const GRAPH_WIDTH =
  SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
export const GRAPH_HEIGHT_LARGE = 180; // Increased from 140px for better visual prominence

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
