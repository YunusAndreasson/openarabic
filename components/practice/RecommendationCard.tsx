import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useRecommendationEngine } from '@/hooks/practice/useRecommendationEngine';
import type { StudyWord } from '@/types/vocabulary.types';

interface RecommendationCardProps {
  studyWords: StudyWord[];
  dueWordsCount: number;
  currentRetention: number;
  learningWords: number;
  masteredWords: number;
  currentStreak?: number;
}

export const RecommendationCard = memo<RecommendationCardProps>(
  ({
    studyWords,
    dueWordsCount,
    currentRetention,
    learningWords,
    masteredWords,
    currentStreak,
  }) => {
    const recommendation = useRecommendationEngine({
      studyWords,
      dueWordsCount,
      currentRetention,
      learningWords,
      masteredWords,
      currentStreak,
    });

    return (
      <BaseCard shadowSize="small">
        <View style={styles.container}>
          <ThemedText type="caption" colorName="text">
            {recommendation.message}
          </ThemedText>
        </View>
      </BaseCard>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

RecommendationCard.displayName = 'RecommendationCard';
