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
export const EFFICIENCY_THRESHOLD = 60; // Minimum efficiency score for "good" performance
export const OPTIMAL_DIFFICULTY_MIN = 0.3; // FSRS optimal difficulty range
export const OPTIMAL_DIFFICULTY_MAX = 0.6;
