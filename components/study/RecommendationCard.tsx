import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import BaseCard from '@/components/common/BaseCard';
import { LAYOUT } from '@/constants/layout';
import { useRecommendationEngine } from '@/hooks/study/useRecommendationEngine';
import type { StudyWord } from '@/types/vocabulary.types';

interface RecommendationCardProps {
  studyWords: StudyWord[];
  dueWordsCount: number;
  currentRetention: number;
  learningWords: number;
  masteredWords: number;
  trend: 'improving' | 'declining' | 'stable';
}

export const RecommendationCard = memo<RecommendationCardProps>(
  ({ studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, trend }) => {
    const recommendation = useRecommendationEngine({
      studyWords,
      dueWordsCount,
      currentRetention,
      learningWords,
      masteredWords,
      trend,
    });

    if (!recommendation) {
      return null;
    }

    return (
      <BaseCard shadowSize="small" style={styles.card}>
        <View style={styles.container}>
          <ThemedText type="caption" colorName="textTertiary" style={styles.message}>
            {recommendation.message}
          </ThemedText>
        </View>
      </BaseCard>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginTop: LAYOUT.SPACING.LARGE, // Match spacing between gauge and stat cards
  },
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  message: {
    lineHeight: 18,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

RecommendationCard.displayName = 'RecommendationCard';

