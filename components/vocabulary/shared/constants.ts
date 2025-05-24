import { Dimensions } from 'react-native';

import { LAYOUT } from '@/constants/layout';

// Graph dimensions
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const GRAPH_WIDTH =
  SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
export const GRAPH_HEIGHT_SMALL = 100;
export const GRAPH_HEIGHT_LARGE = 120;

// Time periods
export const DAYS_14 = 14;
export const DAYS_30 = 30;

// FSRS thresholds
export const MASTERY_STABILITY_THRESHOLD = 5;
export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;
export const EFFICIENCY_THRESHOLD = 70;
