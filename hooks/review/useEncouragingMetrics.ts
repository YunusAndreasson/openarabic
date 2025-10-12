import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';

import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';

export interface EncouragingMetric {
  text: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  type: 'accuracy' | 'efficiency' | 'effort' | 'mastery' | 'streak';
}

/**
 * Build an array of encouraging metric objects for the review completion screen.
 * The metrics summarize session performance and use color information from the
 * current theme.
 */
export const useEncouragingMetrics = (
  sessionMetrics: SessionMetrics | undefined,
  colors: ThemeColors | undefined
): EncouragingMetric[] | null => {
  return useMemo(() => {
    if (!sessionMetrics || !colors || sessionMetrics.wordsReviewed === 0) {
      return null;
    }

    const metrics = sessionMetrics;
    const sessionDuration = Math.round((Date.now() - metrics.startTime) / 60000); // minutes
    const accuracyRate = Math.round((metrics.wordsKnown / metrics.wordsReviewed) * 100);

    const encouragingFacts: EncouragingMetric[] = [];

    // Accuracy achievement
    if (accuracyRate >= 80) {
      encouragingFacts.push({
        text: `Amazing ${accuracyRate}% accuracy`,
        icon: 'checkmark-circle',
        color: colors.completionSuccess,
        type: 'accuracy',
      });
    } else if (accuracyRate >= 60) {
      encouragingFacts.push({
        text: `Solid ${accuracyRate}% accuracy`,
        icon: 'trending-up',
        color: colors.progressIndicator,
        type: 'accuracy',
      });
    } else if (metrics.wordsKnown > 0) {
      const wordText = metrics.wordsKnown === 1 ? 'word' : 'words';
      encouragingFacts.push({
        text: `${metrics.wordsKnown} ${wordText} learned`,
        icon: 'checkmark-circle',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Streak achievements
    if (metrics.longestStreak >= 5) {
      encouragingFacts.push({
        text: `${metrics.longestStreak}-word streak`,
        icon: 'flame',
        color: colors.warning,
        type: 'streak',
      });
    } else if (metrics.longestStreak >= 3) {
      encouragingFacts.push({
        text: `${metrics.longestStreak}-word streak`,
        icon: 'flash',
        color: colors.warning,
        type: 'streak',
      });
    }

    // Mastery progress
    if (metrics.masteredWords > 0) {
      const wordText = metrics.masteredWords === 1 ? 'word' : 'words';
      encouragingFacts.push({
        text: `${metrics.masteredWords} ${wordText} mastered`,
        icon: 'star',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Stability improvement
    if (metrics.averageStabilityIncrease > 0) {
      const avgIncrease = Math.round(metrics.averageStabilityIncrease);
      const dayText = avgIncrease === 1 ? 'day' : 'days';
      encouragingFacts.push({
        text: `Memory ${avgIncrease} ${dayText} stronger`,
        icon: 'bar-chart',
        color: colors.progressIndicator,
        type: 'efficiency',
      });
    }

    // Session efficiency
    if (sessionDuration > 0 && metrics.wordsReviewed >= 10) {
      const wordsPerMinute = Math.round(metrics.wordsReviewed / sessionDuration);
      encouragingFacts.push({
        text: `${wordsPerMinute} words per minute`,
        icon: 'speedometer',
        color: colors.info,
        type: 'efficiency',
      });
    }

    // Effort recognition
    if (metrics.wordsReviewed >= 20) {
      const wordText = metrics.wordsReviewed === 1 ? 'word' : 'words';
      encouragingFacts.push({
        text: `${metrics.wordsReviewed} ${wordText} reviewed`,
        icon: 'trophy',
        color: colors.warning,
        type: 'effort',
      });
    } else if (metrics.wordsReviewed >= 10) {
      const wordText = metrics.wordsReviewed === 1 ? 'word' : 'words';
      encouragingFacts.push({
        text: `${metrics.wordsReviewed} ${wordText} reviewed`,
        icon: 'thumbs-up',
        color: colors.completionSuccess,
        type: 'effort',
      });
    }

    return encouragingFacts.slice(0, 3); // Show max 3 encouraging facts
  }, [sessionMetrics, colors]);
};
