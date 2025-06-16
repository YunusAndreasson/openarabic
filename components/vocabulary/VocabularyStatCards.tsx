import { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { getStrugglingWordsCount } from '@/utils/wordClassification';

import { MemoryCapacityGauge } from './charts/MemoryCapacityGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onStatPress?: (category: StatCategory) => void;
  onStartReview?: () => void;
  studyWords?: StudyWord[];
}

interface WordCategoryConfig {
  value: number;
  label: string;
  iconColor: string;
  bgColor: string;
  category: StatCategory;
  description: string;
}

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStatPress,
    onStartReview,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
    });

    // Validate input data
    const validatedInput = useMemo(
      () => ({
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: Array.isArray(studyWords) ? studyWords : [],
      }),
      [masteredWords, learningWords, dueWords, studyWords]
    );

    // Calculate word categories
    const wordCategories = useMemo(() => {
      const studyWords = validatedInput.studyWords;

      if (!studyWords.length) {
        return {
          dueWords: 0,
          learningWords: 0,
          strugglingWords: 0,
          masteredWords: 0,
        };
      }

      const now = new Date();

      // Calculate categories based on FSRS data and learning state in one pass
      const { dueWords, learningWords, masteredWords } = studyWords.reduce(
        (counts, word) => {
          const stability = word.fsrs_stability || 0;
          const difficulty = word.fsrs_difficulty || 5;

          if (word.fsrs_due && new Date(word.fsrs_due) <= now) {
            counts.dueWords += 1;
          }

          if (stability > 0 && stability < 21 && difficulty > 3) {
            counts.learningWords += 1;
          }

          if (stability >= 7 && difficulty <= 5) {
            counts.masteredWords += 1;
          }

          return counts;
        },
        { dueWords: 0, learningWords: 0, masteredWords: 0 }
      );

      const strugglingWords = getStrugglingWordsCount(studyWords);

      return {
        dueWords,
        learningWords,
        strugglingWords,
        masteredWords,
      };
    }, [validatedInput.studyWords]);

    // Create focused practice session cards
    const totalWords = validatedInput.studyWords.length;
    const categories: WordCategoryConfig[] = useMemo(() => {
      const cards = [];

      // Always show due words if available
      if (wordCategories.dueWords > 0) {
        cards.push({
          value: wordCategories.dueWords,
          label: 'Due Now',
          iconColor: colors.error,
          bgColor: colors.elevation1,
          category: 'due' as StatCategory,
          description: 'Regular practice for scheduled words',
        });
      }

      // Always show challenging words if available
      if (wordCategories.strugglingWords > 0) {
        cards.push({
          value: wordCategories.strugglingWords,
          label: 'Challenging',
          iconColor: colors.warning,
          bgColor: colors.elevation1,
          category: 'needsAttention' as StatCategory,
          description: 'Drill down on challenging words',
        });
      }

      // Always show all words option if user has words
      if (totalWords > 0) {
        cards.push({
          value: totalWords,
          label: 'All Words',
          iconColor: colors.tint,
          bgColor: colors.elevation1,
          category: 'total' as StatCategory,
          description: 'If you want to do additional practice',
        });
      }

      return cards;
    }, [wordCategories, colors, totalWords]);

    return (
      <View style={styles.container}>
        {/* Memory Capacity Gauge - without heading */}
        <MemoryCapacityGauge studyWords={validatedInput.studyWords} onStatPress={onStatPress} />

        {categories.map(config => (
          <TouchableOpacity
            key={config.category}
            activeOpacity={0.7}
            onPress={onStartReview}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            testID={`start-review-${config.category}`}
          >
            <Animated.View
              style={[
                styles.categoryCard,
                { backgroundColor: config.bgColor },
                animatedStyle as ViewStyle,
              ]}
            >
              {/* Number Badge */}
              <View style={[styles.numberBadge, { backgroundColor: config.iconColor }]}>
                <ThemedText style={[styles.numberText, { color: colors.white }]}>
                  {config.value}
                </ThemedText>
              </View>

              {/* Content */}
              <View style={styles.categoryContent}>
                <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                <ThemedText style={styles.categoryDescription} type="caption" variant="secondary">
                  {config.description}
                </ThemedText>
              </View>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  categoryCard: {
    ...LAYOUT.ELEVATION.SMALL,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.SPACING.XLARGE,
  },
  numberBadge: {
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  numberText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '700',
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  categoryDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
