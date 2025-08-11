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
  STRENGTH: '📈 Memory strength', // How strong your memory is (last 7 days)
  RETENTION: '⏰ Review schedule', // When words will need review (next 7 days)
  SPEED: '⚡ Learning speed', // How fast you are learning (last 7 days)

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

// Chart-specific subtitle generators with consistent messaging and clear directional context
export const generateChartSubtitle = {
  mastery: (
    currentRate: number,
    trend: 'declining' | 'improving' | 'stable',
    weeklyChange: number
  ): string => {
    if (currentRate === 0) {
      return STRINGS.START_REVIEWING_TO_BUILD_STRENGTH;
    }

    const performance = getPerformanceLevel(currentRate);
    const baseMessage = PERFORMANCE_DESCRIPTORS[performance].short;

    if (Math.abs(weeklyChange) >= 5) {
      return `${baseMessage} • ${TREND_MESSAGES[trend].description} (last 7 days)`;
    }

    return `${baseMessage} (last 7 days)`;
  },

  efficiency: (currentEfficiency: number, weeklyAverage: number): string => {
    if (currentEfficiency === 0) {
      return STRINGS.START_PRACTICING_TO_SEE_SPEED;
    }

    const performance = getPerformanceLevel(currentEfficiency);
    const avgPerformance = getPerformanceLevel(weeklyAverage);

    if (performance === avgPerformance) {
      return `${STRINGS.ON_TRACK_WITH_USUAL_SPEED} (last 7 days)`;
    }

    const comparison =
      currentEfficiency > weeklyAverage ? STRINGS.FASTER_THAN_USUAL : STRINGS.SLOWER_THAN_USUAL;
    return `${comparison} (last 7 days)`;
  },

  retrievability: (
    _currentRetention: number,
    criticalWords: number,
    totalWords: number
  ): string => {
    if (totalWords === 0) {
      return STRINGS.STUDY_TO_MONITOR_REVIEW_TIMING;
    }

    const criticalPercentage = (criticalWords / totalWords) * 100;

    if (criticalWords === 0) {
      return `${STRINGS.ALL_WORDS_LOOK_STABLE} (next 7 days)`;
    }

    if (criticalPercentage > 30) {
      return `${Math.round(criticalPercentage)}% of words need urgent review (next 7 days)`;
    }

    return `${criticalWords} words likely to be forgotten soon (next 7 days)`;
  },
} as const;

// Jakob's Law: Users expect specific, actionable empty states like fitness apps (Strava, MyFitnessPal)
// Updated from generic messages to specific action + benefit format
export const EMPTY_STATE_MESSAGES = {
  mastery: 'Complete your first 5 reviews to see your memory strength trend',
  efficiency: 'Practice 10 words to track your learning speed progress',
  retrievability: 'Study 5 words to monitor which ones need review timing',
  general: 'Add your first words to start tracking your progress',
} as const;
