import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common/BaseCard';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useRecommendationEngine } from '@/hooks/study/useRecommendationEngine';
import { selectionFeedback } from '@/utils/haptics';
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
    const router = useRouter();
    const recommendation = useRecommendationEngine({
      studyWords,
      dueWordsCount,
      currentRetention,
      learningWords,
      masteredWords,
      trend,
    });

    const handleInfoPress = useCallback(() => {
      selectionFeedback();
      router.push(`${ROUTE_PATHS.ACCOUNT_HELP}?expandItem=why-review-before-adding`);
    }, [router]);

    if (!recommendation) {
      return null;
    }

    return (
      <BaseCard shadowSize="small" style={styles.card} onPress={handleInfoPress}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText
              type="caption"
              weight="normal"
              colorName="secondaryText"
              style={styles.message}
            >
              {recommendation.message}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  message: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

RecommendationCard.displayName = 'RecommendationCard';
