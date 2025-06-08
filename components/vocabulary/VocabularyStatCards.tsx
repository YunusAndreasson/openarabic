import React, { memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { getStrugglingWordsCount } from '@/utils/wordClassification';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/theme/useColors';

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

      // Calculate categories based on FSRS data and learning state
      const dueWords = studyWords.filter(word => {
        if (!word.fsrs_due) return false;
        return new Date(word.fsrs_due) <= now;
      }).length;

      const learningWords = studyWords.filter(word => {
        const stability = word.fsrs_stability || 0;
        const difficulty = word.fsrs_difficulty || 5;
        // Words with low stability (< 21 days) and being actively learned
        return stability > 0 && stability < 21 && difficulty > 3;
      }).length;

      const strugglingWords = getStrugglingWordsCount(studyWords);

      const masteredWords = studyWords.filter(word => {
        const stability = word.fsrs_stability || 0;
        const difficulty = word.fsrs_difficulty || 5;
        // Well-established words with good stability
        return stability >= 7 && difficulty <= 5;
      }).length;

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
          label: 'Practice Due Words',
          iconColor: colors.error,
          bgColor: colors.card,
          category: 'due' as StatCategory,
          description: 'Review scheduled words',
        });
      }

      // Always show challenging words if available
      if (wordCategories.strugglingWords > 0) {
        cards.push({
          value: wordCategories.strugglingWords,
          label: 'Practice Challenging',
          iconColor: colors.warning,
          bgColor: colors.card,
          category: 'needsAttention' as StatCategory,
          description: 'Focus on difficult words',
        });
      }

      // Always show all words option if user has words
      if (totalWords > 0) {
        cards.push({
          value: totalWords,
          label: 'Practice All Words',
          iconColor: colors.tint,
          bgColor: colors.card,
          category: 'total' as StatCategory,
          description: 'Long randomized session',
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
            accessibilityLabel={`Practice ${config.value} ${config.category === 'due' ? 'due' : config.category === 'total' ? '' : config.category} words`}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[styles.categoryCard, { backgroundColor: config.bgColor }]}
            onPress={onStartReview}
          >
            {/* Number Badge */}
            <View style={[styles.numberBadge, { backgroundColor: config.iconColor }]}>
              <ThemedText style={styles.numberText}>{config.value}</ThemedText>
            </View>

            {/* Content */}
            <View style={styles.categoryContent}>
              <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
              <ThemedText style={styles.categoryDescription} type="caption" variant="secondary">
                {config.description}
              </ThemedText>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  numberText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '700',
    color: Colors.light.background,
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
