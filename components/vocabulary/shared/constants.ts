import { Dimensions } from 'react-native';

import { LAYOUT } from '@/constants/layout';

// Graph dimensions
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const GRAPH_WIDTH =
  SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
export const GRAPH_HEIGHT_SMALL = 100;
export const GRAPH_HEIGHT_LARGE = 140;

// Time periods
export const DAYS_14 = 14;
export const DAYS_30 = 30;

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

// Standardized performance zone names
export const PERFORMANCE_ZONES = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
} as const;

// FSRS difficulty thresholds (validated from database analysis)
export const FSRS_DIFFICULTY_THRESHOLDS = {
  EASY: 6.5,
  MEDIUM: 8.0,
} as const;
