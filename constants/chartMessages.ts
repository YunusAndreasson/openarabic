/**
 * Standardized Chart Messaging System
 *
 * Provides consistent, clear communication across all vocabulary charts
 * with unified terminology and display formats.
 */

import { STRINGS } from '@/constants/strings';

// Standardized chart titles (no emoji — clean, straight to the point)
export const CHART_LABELS = {
  STRENGTH: 'Mastery', // Cumulative mastered words over time
  RETENTION: 'Review schedule', // When words will need review (next 7 days)
  DUE_WORDS_PROGNOSIS: 'This week', // Projected due words (next 7 days)
} as const;

// Chart-specific subtitle generators with consistent messaging
export const generateChartSubtitle = {
  retrievability: (
    _currentRetention: number,
    criticalWords: number,
    totalWords: number,
  ): string => {
    if (totalWords === 0) {
      return STRINGS.STUDY_TO_MONITOR_REVIEW_TIMING;
    }

    const criticalPercentage = (criticalWords / totalWords) * 100;

    if (criticalWords === 0) {
      return `${STRINGS.ALL_WORDS_LOOK_STABLE} (next 7 days)`;
    }

    if (criticalPercentage > 30) {
      return `${Math.round(criticalPercentage)}${STRINGS.WORDS_NEED_URGENT_REVIEW} (next 7 days)`;
    }

    return `${criticalWords}${STRINGS.WORDS_LIKELY_FORGOTTEN} (next 7 days)`;
  },
} as const;

// Jakob's Law: Users expect specific, actionable empty states like fitness apps (Strava, MyFitnessPal)
// Updated from generic messages to specific action + benefit format
export const EMPTY_STATE_MESSAGES = {
  mastery: STRINGS.EMPTY_STATE_MASTERY,
  learned: STRINGS.EMPTY_STATE_LEARNED,
  efficiency: STRINGS.EMPTY_STATE_EFFICIENCY,
  retrievability: STRINGS.EMPTY_STATE_RETRIEVABILITY,
  dueWords: STRINGS.EMPTY_STATE_DUE_WORDS,
  general: STRINGS.EMPTY_STATE_GENERAL,
} as const;
