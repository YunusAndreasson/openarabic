/**
 * Standardized Chart Messaging System
 *
 * Provides consistent, clear communication across all vocabulary charts
 * with unified terminology, display formats, and performance indicators.
 */

import type { StatCategory } from '@/types/vocabulary.types';
import { PERFORMANCE_THRESHOLDS } from './constants';

// Standardized terminology
export const CHART_LABELS = {
  // Performance metrics - with clear time indicators for zero confusion
  STRENGTH: 'recent strength', // Latest from 14-day progression
  RETENTION: "today's retention", // Today's memory forecast
  SPEED: 'recent learning speed', // Latest from 14-day efficiency data
  DIFFICULTY: 'overall challenge level', // Analysis across all words

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

// Standardized stat value formatters with enhanced polish
export const formatStatValue = {
  percentage: (value: number): string => {
    // Enhanced formatting with proper spacing and consistency
    const rounded = Math.round(value);
    return `${rounded}%`;
  },
  count: (value: number): string => {
    // Better number formatting for large counts
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  },
  days: (value: number): string => `${value}d`,
  decimal: (value: number, places: number = 1): string => value.toFixed(places),
} as const;

// Standardized performance level indicators
export const getPerformanceLevel = (value: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (value >= PERFORMANCE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (value >= PERFORMANCE_THRESHOLDS.GOOD) return 'good';
  if (value >= PERFORMANCE_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
};

// Standardized performance descriptors
export const PERFORMANCE_DESCRIPTORS = {
  excellent: {
    short: 'Excellent',
    medium: 'Performing excellently',
    long: 'Outstanding performance',
  },
  good: {
    short: 'Good',
    medium: 'Performing well',
    long: 'Good performance',
  },
  fair: {
    short: 'Fair',
    medium: 'Room for improvement',
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
    description: 'trending upward',
  },
  declining: {
    suffix: '↘ declining',
    description: 'trending downward',
  },
  stable: {
    suffix: '→ stable',
    description: 'steady performance',
  },
} as const;

// Chart-specific subtitle generators with consistent messaging
export const generateChartSubtitle = {
  mastery: (
    currentRate: number,
    trend: 'improving' | 'declining' | 'stable',
    weeklyChange: number
  ): string => {
    if (currentRate === 0) {
      return 'Start reviewing to build memory strength';
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
      return 'Practice to track learning speed';
    }

    const performance = getPerformanceLevel(currentEfficiency);
    const avgPerformance = getPerformanceLevel(weeklyAverage);

    if (performance === avgPerformance) {
      return `${PERFORMANCE_DESCRIPTORS[performance].medium} - consistent pace`;
    }

    const comparison =
      currentEfficiency > weeklyAverage ? 'faster than usual' : 'slower than usual';
    return `${PERFORMANCE_DESCRIPTORS[performance].short} pace - ${comparison}`;
  },

  retrievability: (currentRetention: number, criticalWords: number, totalWords: number): string => {
    if (totalWords === 0) {
      return 'Study words to track memory retention';
    }

    const performance = getPerformanceLevel(currentRetention);
    const criticalPercentage = (criticalWords / totalWords) * 100;

    if (criticalWords === 0) {
      return `${PERFORMANCE_DESCRIPTORS[performance].medium} - all words retained well`;
    }

    if (criticalPercentage > 30) {
      return `${Math.round(criticalPercentage)}% words need urgent review`;
    }

    return `${PERFORMANCE_DESCRIPTORS[performance].medium} - ${criticalWords} words fading`;
  },

  difficulty: (
    hardWordsPercentage: number,
    distribution: 'easy' | 'balanced' | 'challenging'
  ): string => {
    if (hardWordsPercentage === 0) {
      return 'Track word difficulty levels';
    }

    switch (distribution) {
      case 'easy':
        return `${Math.round(hardWordsPercentage)}% struggling - ready for harder content`;
      case 'challenging':
        return `${Math.round(hardWordsPercentage)}% struggling - focus on review`;
      default:
        if (hardWordsPercentage > 25) {
          return `${Math.round(hardWordsPercentage)}% struggling - prioritize practice`;
        }
        return 'Well-balanced difficulty spread';
    }
  },
} as const;

// Standardized left/right stat configurations for charts with semantic matching
export interface StandardizedStat {
  value: string;
  label: string;
  color: string;
  onPress?: () => void;
  showChevron?: boolean; // Indicator for tappable stats
}

export const createStandardizedStats = {
  mastery: (
    currentRate: number,
    totalMastered: number,
    performanceColor: string,
    masteredColor: string,
    onStatPress?: (category: StatCategory) => void
  ): { leftStat: StandardizedStat; rightStat: StandardizedStat } => ({
    leftStat: {
      value: formatStatValue.percentage(currentRate),
      label: CHART_LABELS.STRENGTH,
      color: performanceColor, // Performance-based color
    },
    rightStat: {
      value: formatStatValue.count(totalMastered),
      label: CHART_LABELS.MASTERED, // Semantic match: strength → mastered words
      color: masteredColor,
      onPress: onStatPress ? () => onStatPress('mastered') : undefined,
      showChevron: totalMastered > 0 && !!onStatPress, // Show chevron if words exist and tappable
    },
  }),

  efficiency: (
    currentEfficiency: number,
    learningWords: number, // Changed from weeklyAverage to learningWords for semantic matching
    currentColor: string,
    learningColor: string,
    onStatPress?: (category: StatCategory) => void
  ): { leftStat: StandardizedStat; rightStat: StandardizedStat } => ({
    leftStat: {
      value: formatStatValue.percentage(currentEfficiency),
      label: CHART_LABELS.SPEED,
      color: currentColor, // Performance-based color
    },
    rightStat: {
      value: formatStatValue.count(learningWords),
      label: CHART_LABELS.LEARNING, // Semantic match: learning speed → learning words
      color: learningColor,
      onPress: onStatPress ? () => onStatPress('learning') : undefined,
      showChevron: learningWords > 0 && !!onStatPress, // Show chevron if words exist and tappable
    },
  }),

  retrievability: (
    currentRetention: number,
    criticalWords: number,
    retentionColor: string,
    criticalColor: string,
    onStatPress?: (category: StatCategory) => void
  ): { leftStat: StandardizedStat; rightStat: StandardizedStat } => ({
    leftStat: {
      value: formatStatValue.percentage(currentRetention),
      label: CHART_LABELS.RETENTION,
      color: retentionColor, // Performance-based color
    },
    rightStat: {
      value: formatStatValue.count(criticalWords),
      label: CHART_LABELS.CRITICAL, // Semantic match: retention → critical words
      color: criticalColor,
      onPress: onStatPress ? () => onStatPress('needsAttention') : undefined,
      showChevron: criticalWords > 0 && !!onStatPress, // Show chevron if words exist and tappable
    },
  }),

  difficulty: (
    averageDifficulty: number, // Changed from dominantLevelLabel to show actual difficulty percentage
    strugglingWords: number, // Changed from totalWords to strugglingWords for semantic matching
    difficultyColor: string,
    strugglingColor: string,
    onStatPress?: (category: StatCategory) => void
  ): { leftStat: StandardizedStat; rightStat: StandardizedStat } => ({
    leftStat: {
      value: formatStatValue.percentage(averageDifficulty),
      label: CHART_LABELS.DIFFICULTY,
      color: difficultyColor, // Performance-based color
    },
    rightStat: {
      value: formatStatValue.count(strugglingWords),
      label: CHART_LABELS.STRUGGLING, // Semantic match: difficulty → struggling words
      color: strugglingColor,
      onPress: onStatPress ? () => onStatPress('needsAttention') : undefined,
      showChevron: strugglingWords > 0 && !!onStatPress, // Show chevron if words exist and tappable
    },
  }),
} as const;

// Standardized empty state messages
export const EMPTY_STATE_MESSAGES = {
  mastery: 'Study words to track memory strength',
  efficiency: 'Practice regularly to see learning speed',
  retrievability: 'Review words to monitor retention',
  difficulty: 'Study words to identify challenge levels',
  general: 'Study words to see your progress',
} as const;

// Standardized error messages
export const ERROR_MESSAGES = {
  loadError: 'Unable to load chart data',
  noData: 'No data available',
  processingError: 'Error processing data',
} as const;
