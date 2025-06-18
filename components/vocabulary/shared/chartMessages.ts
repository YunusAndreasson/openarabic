/**
 * Standardized Chart Messaging System
 *
 * Provides consistent, clear communication across all vocabulary charts
 * with unified terminology, display formats, and performance indicators.
 */

import { STRINGS } from '@/constants/strings';

import { PERFORMANCE_THRESHOLDS } from './constants';

// Standardized terminology
export const CHART_LABELS = {
  // Performance metrics - with clear time indicators for zero confusion
  STRENGTH: 'recent strength', // Latest from 7-day progression
  RETENTION: "today's retention", // Today's memory forecast
  SPEED: 'recent learning speed', // Latest from 7-day efficiency data

  // Word categories
  MASTERED: 'mastered',
  LEARNING: 'learning',
  DUE: 'due',
  STRUGGLING: 'struggling', // Consistent term across all charts
  TOTAL: 'total words',
  CRITICAL: 'critical', // For words needing immediate attention

  // Time periods
  TODAY: 'today',
  WEEKLY: 'weekly avg',
  RECENT: 'recent',
  TREND: 'trend',
} as const;

// Standardized performance level indicators
export const getPerformanceLevel = (value: number): 'excellent' | 'fair' | 'good' | 'poor' => {
  if (value >= PERFORMANCE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (value >= PERFORMANCE_THRESHOLDS.GOOD) return 'good';
  if (value >= PERFORMANCE_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
};

// Standardized performance descriptors
export const PERFORMANCE_DESCRIPTORS = {
  excellent: {
    short: 'Excellent',
    medium: STRINGS.PERFORMING_EXCELLENTLY,
    long: STRINGS.OUTSTANDING_PERFORMANCE,
  },
  good: {
    short: 'Good',
    medium: STRINGS.PERFORMING_WELL,
    long: 'Good performance',
  },
  fair: {
    short: 'Fair',
    medium: STRINGS.ROOM_FOR_IMPROVEMENT,
    long: 'Fair performance, focus on practice',
  },
  poor: {
    short: 'Needs Work',
    medium: 'Needs attention',
    long: 'Requires focused practice',
  },
} as const;

// Standardized trend indicators
export const TREND_MESSAGES = {
  improving: {
    suffix: '↗ improving',
    description: STRINGS.TRENDING_UPWARD,
  },
  declining: {
    suffix: '↘ declining',
    description: STRINGS.TRENDING_DOWNWARD,
  },
  stable: {
    suffix: '→ stable',
    description: STRINGS.STEADY_PERFORMANCE,
  },
} as const;

// Chart-specific subtitle generators with consistent messaging
export const generateChartSubtitle = {
  mastery: (
    currentRate: number,
    trend: 'declining' | 'improving' | 'stable',
    weeklyChange: number
  ): string => {
    if (currentRate === 0) {
      return STRINGS.REVIEW_WORDS_TO_BUILD_MEMORY_STRENGTH;
    }

    const performance = getPerformanceLevel(currentRate);
    const baseMessage = PERFORMANCE_DESCRIPTORS[performance].medium;

    if (Math.abs(weeklyChange) >= 5) {
      return `${baseMessage} - ${TREND_MESSAGES[trend].description}`;
    }

    return baseMessage;
  },

  efficiency: (currentEfficiency: number, weeklyAverage: number): string => {
    if (currentEfficiency === 0) {
      return STRINGS.PRACTICE_TO_SEE_LEARNING_SPEED;
    }

    const performance = getPerformanceLevel(currentEfficiency);
    const avgPerformance = getPerformanceLevel(weeklyAverage);

    if (performance === avgPerformance) {
      return `${PERFORMANCE_DESCRIPTORS[performance].medium} - ${STRINGS.CONSISTENT_PRACTICE}`;
    }

    const comparison =
      currentEfficiency > weeklyAverage ? 'faster than usual' : 'slower than usual';
    return `${PERFORMANCE_DESCRIPTORS[performance].short} pace - ${comparison}`;
  },

  retrievability: (currentRetention: number, criticalWords: number, totalWords: number): string => {
    if (totalWords === 0) {
      return STRINGS.REVIEW_WORDS_TO_TRACK_RETENTION;
    }

    const performance = getPerformanceLevel(currentRetention);
    const criticalPercentage = (criticalWords / totalWords) * 100;

    if (criticalWords === 0) {
      return `${PERFORMANCE_DESCRIPTORS[performance].medium} - ${STRINGS.ALL_WORDS_RETAINED_WELL}`;
    }

    if (criticalPercentage > 30) {
      return `${Math.round(criticalPercentage)}% words need urgent review`;
    }

    return `${PERFORMANCE_DESCRIPTORS[performance].medium} - ${criticalWords} words fading`;
  },
} as const;

// Standardized empty state messages
export const EMPTY_STATE_MESSAGES = {
  mastery: STRINGS.REVIEW_WORDS_TO_TRACK_MEMORY_STRENGTH,
  efficiency: STRINGS.PRACTICE_TO_SEE_YOUR_LEARNING_SPEED,
  retrievability: STRINGS.STUDY_WORDS_TO_MONITOR_RETENTION,
  general: STRINGS.START_STUDYING_TO_SEE_PROGRESS,
} as const;
