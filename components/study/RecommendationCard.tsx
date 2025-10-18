import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common/BaseCard';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useColors } from '@/hooks/theme/useColors';
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
    const colors = useColors();
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
            <Ionicons
              name="information-circle-outline"
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              color={colors.disabled}
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: LAYOUT.SPACING.SMALL,
  },
  message: {
    flex: 1,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

RecommendationCard.displayName = 'RecommendationCard';

