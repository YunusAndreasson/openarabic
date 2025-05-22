import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import BaseCard from '@/components/BaseCard';
import { LAYOUT } from '@/constants/layout';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Learning status indicator states
 */
export enum LearningStatus {
  Good = 'good',
  Warning = 'warning',
  Review = 'review',
}

interface LearningStatusIndicatorProps {
  dueWords: number;
  totalWords: number;
  learningWords: number;
  masteredWords: number;
  /**
   * Override the calculated status (mostly for testing)
   */
  statusOverride?: LearningStatus;
}

/**
 * Component that displays learning recommendations
 * using spaced repetition principles
 */
export const LearningStatusIndicator = memo(
  ({
    dueWords,
    totalWords,
    learningWords,
    masteredWords,
    statusOverride,
  }: LearningStatusIndicatorProps) => {
    const colors = useColors();

    // Calculate the learning status based on advanced FSRS data analysis
    const status = useMemo(() => {
      if (statusOverride) return statusOverride;

      // If there are no words or very few, always encourage adding words
      if (totalWords < 10) return LearningStatus.Good;

      // Calculate learning metrics
      const reviewBurden = dueWords / (learningWords || 1);
      const masteryPercentage = masteredWords / (totalWords || 1);
      const isBeginnerLearner = totalWords < 50;
      const isAdvancedLearner = masteryPercentage > 0.4;

      // For beginners, prioritize adding words with minimal review burden
      if (isBeginnerLearner && dueWords < 10) {
        return LearningStatus.Good;
      }

      // For experienced users with high mastery, allow higher review burden
      if (isAdvancedLearner) {
        if (reviewBurden > 0.4 && dueWords > 20) {
          return LearningStatus.Review;
        } else if (reviewBurden > 0.25 && dueWords > 15) {
          return LearningStatus.Warning;
        }
        return LearningStatus.Good;
      }

      // Standard learning curve
      if (reviewBurden > 0.35 && dueWords > 15) {
        return LearningStatus.Review;
      } else if (reviewBurden > 0.2 && dueWords > 8) {
        return LearningStatus.Warning;
      }

      // Default: good to add more words
      return LearningStatus.Good;
    }, [dueWords, learningWords, totalWords, masteredWords, statusOverride]);

    // Get colors and copy based on status
    const { backgroundColor, iconColor, borderColor, recommendation } = useMemo(() => {
      switch (status) {
        case LearningStatus.Good:
          return {
            backgroundColor: withOpacity(colors.success, 0.15),
            iconColor: colors.success,
            borderColor: colors.success + '30',
            recommendation: 'Add more words to your vocabulary',
          };
        case LearningStatus.Warning:
          return {
            backgroundColor: withOpacity(colors.warning, 0.15),
            iconColor: colors.warning,
            borderColor: colors.warning + '30',
            recommendation: 'Focus on reviews before adding new words',
          };
        case LearningStatus.Review:
          return {
            backgroundColor: withOpacity(colors.error, 0.15),
            iconColor: colors.error,
            borderColor: colors.error + '30',
            recommendation: 'Complete your reviews first',
          };
      }
    }, [status, colors]);

    return (
      <BaseCard
        style={[styles.container, { backgroundColor, borderColor }]}
        shadowSize="small"
        includePressAnimation={false}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <ThemedText type="overline" variant="secondary" style={styles.recommendationLabel}>
              RECOMMENDATION
            </ThemedText>
            <ThemedText
              type="body"
              weight="bold"
              style={[styles.recommendation, { color: iconColor }]}
              numberOfLines={2}
            >
              {recommendation}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    );
  }
);

LearningStatusIndicator.displayName = 'LearningStatusIndicator';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.XLARGE, // More space at bottom for clear section end
    borderLeftWidth: LAYOUT.BORDER.WIDTH.THICK,
    overflow: 'hidden',
  },
  content: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  recommendationLabel: {
    marginBottom: LAYOUT.SPACING.SMALL, // Better spacing for readability
  },
  recommendation: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4, // Better line height for readability
  },
});
