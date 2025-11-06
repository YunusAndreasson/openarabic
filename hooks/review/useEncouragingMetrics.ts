import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';

import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';

export interface EncouragingMetric {
  text: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  type: 'due' | 'daily_streak' | 'mastery';
}

/**
 * Build an array of encouraging metric objects for the review completion screen.
 * Shows exactly 3 metrics matching the Practice tab's traffic light pattern:
 * Red (Due) → Yellow (Streak) → Green (Mastered)
 *
 * @param sessionMetrics - Metrics from the completed session
 * @param colors - Theme colors
 * @param dailyStreak - Current daily study streak (0 if none)
 */
export const useEncouragingMetrics = (
  sessionMetrics: SessionMetrics | undefined,
  colors: ThemeColors | undefined,
  dailyStreak: number = 0,
): EncouragingMetric[] | null => {
  return useMemo(() => {
    if (!sessionMetrics || !colors || sessionMetrics.wordsReviewed === 0) {
      return null;
    }

    const metrics = sessionMetrics;

    // Traffic light metrics (always show these 3 in order)
    const trafficLightMetrics: EncouragingMetric[] = [];

    // 🔴 RED - Due words practiced
    const wordText = metrics.wordsReviewed === 1 ? 'word' : 'words';
    trafficLightMetrics.push({
      text: `${metrics.wordsReviewed} ${wordText} reviewed`,
      icon: 'time',
      color: colors.error,
      type: 'due',
    });

    // 🟡 YELLOW - Daily study streak
    if (dailyStreak > 1) {
      trafficLightMetrics.push({
        text: `${dailyStreak} day streak`,
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    } else if (dailyStreak === 1) {
      trafficLightMetrics.push({
        text: 'Streak started!',
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    } else {
      // No streak yet - encourage starting one
      trafficLightMetrics.push({
        text: 'Start your streak',
        icon: 'flame',
        color: colors.warning,
        type: 'daily_streak',
      });
    }

    // 🟢 GREEN - Mastered words (only NEW words mastered in THIS session)
    if (metrics.masteredWords > 0) {
      const masteredText = metrics.masteredWords === 1 ? 'word' : 'words';
      trafficLightMetrics.push({
        text: `${metrics.masteredWords} ${masteredText} mastered`,
        icon: 'trophy',
        color: colors.success,
        type: 'mastery',
      });
    } else {
      // Clearer: this is about NEW mastery in this session, not total mastery
      trafficLightMetrics.push({
        text: 'No new words mastered',
        icon: 'trophy',
        color: colors.success,
        type: 'mastery',
      });
    }

    return trafficLightMetrics;
  }, [sessionMetrics, colors, dailyStreak]);
};
