import type { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { SessionMetrics } from '@/types/review.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { STRINGS } from '@/constants/strings';

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
        text: STRINGS.ACCURACY_EXCELLENT_TEMPLATE.replace('{percent}', String(accuracyRate)),
        icon: 'checkmark-circle',
        color: colors.completionSuccess,
        type: 'accuracy',
      });
    } else if (accuracyRate >= 60) {
      encouragingFacts.push({
        text: STRINGS.ACCURACY_SOLID_TEMPLATE.replace('{percent}', String(accuracyRate)),
        icon: 'trending-up',
        color: colors.progressIndicator,
        type: 'accuracy',
      });
    } else if (metrics.wordsKnown > 0) {
      encouragingFacts.push({
        text: STRINGS.WORDS_STRONG_SESSION_TEMPLATE.replace('{count}', String(metrics.wordsKnown)),
        icon: 'checkmark-circle',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Streak achievements
    if (metrics.longestStreak >= 5) {
      encouragingFacts.push({
        text: STRINGS.STREAK_EXCELLENT_TEMPLATE.replace('{count}', String(metrics.longestStreak)),
        icon: 'flame',
        color: colors.warning,
        type: 'streak',
      });
    } else if (metrics.longestStreak >= 3) {
      encouragingFacts.push({
        text: STRINGS.STREAK_ACHIEVED_TEMPLATE.replace('{count}', String(metrics.longestStreak)),
        icon: 'flash',
        color: colors.warning,
        type: 'streak',
      });
    }

    // Mastery progress
    if (metrics.masteredWords > 0) {
      encouragingFacts.push({
        text: STRINGS.MASTERED_WORDS_TEMPLATE.replace('{count}', String(metrics.masteredWords)),
        icon: 'star',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Stability improvement
    if (metrics.averageStabilityIncrease > 0) {
      const avgIncrease = Math.round(metrics.averageStabilityIncrease);
      encouragingFacts.push({
        text: STRINGS.MEMORY_STRENGTH_BOOST_TEMPLATE.replace('{days}', String(avgIncrease)),
        icon: 'bar-chart',
        color: colors.progressIndicator,
        type: 'efficiency',
      });
    }

    // Session efficiency
    if (sessionDuration > 0 && metrics.wordsReviewed >= 10) {
      const wordsPerMinute = Math.round(metrics.wordsReviewed / sessionDuration);
      encouragingFacts.push({
        text: STRINGS.WORDS_PER_MIN_TEMPLATE.replace('{rate}', String(wordsPerMinute)),
        icon: 'speedometer',
        color: colors.info,
        type: 'efficiency',
      });
    }

    // Effort recognition
    if (metrics.wordsReviewed >= 20) {
      encouragingFacts.push({
        text: STRINGS.WORDS_REVIEWED_DEDICATION_TEMPLATE.replace('{count}', String(metrics.wordsReviewed)),
        icon: 'trophy',
        color: colors.warning,
        type: 'effort',
      });
    } else if (metrics.wordsReviewed >= 10) {
      encouragingFacts.push({
        text: STRINGS.WORDS_REVIEWED_GREAT_TEMPLATE.replace('{count}', String(metrics.wordsReviewed)),
        icon: 'thumbs-up',
        color: colors.completionSuccess,
        type: 'effort',
      });
    }

    return encouragingFacts.slice(0, 3); // Show max 3 encouraging facts
  }, [sessionMetrics, colors]);
};

export default useEncouragingMetrics;
