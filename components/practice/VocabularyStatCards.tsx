/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { StatCategory, StudyWord } from '@/types/vocabulary.types';
import { calculateWordCategories } from '@/utils/wordClassification';

import { StatCard } from './StatCard';
import { MemoryRetentionGauge } from './charts/MemoryRetentionGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onStartReview?: (category: StatCategory) => void;
  onInfoPress?: () => void;
  studyWords?: StudyWord[];
  // Number of words eligible for "Study all words" after cooldown filtering
  eligibleAllWordsCount?: number;
}

interface WordCategoryConfig {
  value: number;
  label: string;
  category: StatCategory;
  disabled?: boolean;
  disabledMessage?: string;
  capacityPhase: 'red' | 'yellow' | 'green';
}

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStartReview,
    onInfoPress,
    studyWords = [],
    eligibleAllWordsCount,
  }: VocabularyStatCardsProps) => {
    const validatedInput = {
      masteredWords: Math.max(0, masteredWords),
      learningWords: Math.max(0, learningWords),
      dueWords: Math.max(0, dueWords),
      studyWords: Array.isArray(studyWords) ? studyWords : [],
    };

    const wordCategories = calculateWordCategories(
      validatedInput.studyWords,
      validatedInput.dueWords
    );

    const totalWords = validatedInput.studyWords.length;
    const categories: WordCategoryConfig[] = [
      {
        value: wordCategories.dueWords,
        label: STRINGS.URGENT_PRESERVATION,
        category: 'due' as StatCategory,
        disabled: wordCategories.dueWords === 0,
        disabledMessage: wordCategories.dueWords === 0 ? STRINGS.NO_WORDS_TO_STUDY : undefined,
        capacityPhase: 'red' as const,
      },
      {
        value: wordCategories.strugglingWords,
        label: STRINGS.EFFORTFUL_RETRIEVAL,
        category: 'struggling' as StatCategory,
        disabled: wordCategories.dueWords > 0 || wordCategories.strugglingWords === 0,
        disabledMessage:
          wordCategories.dueWords > 0
            ? STRINGS.COMPLETE_DUE_FIRST
            : wordCategories.strugglingWords === 0
            ? STRINGS.NO_WORDS_TO_STUDY
            : undefined,
        capacityPhase: 'yellow' as const,
      },
      // Always show "Study all words"; disable when not eligible (recently reviewed) or blocked by other priorities
      {
        value: typeof eligibleAllWordsCount === 'number' ? eligibleAllWordsCount : totalWords,
        label: STRINGS.INTERLEAVED_REVIEW,
        category: 'total' as StatCategory,
        disabled:
          wordCategories.dueWords > 0 ||
          wordCategories.strugglingWords > 0 ||
          (typeof eligibleAllWordsCount === 'number' ? eligibleAllWordsCount : totalWords) === 0,
        disabledMessage:
          wordCategories.dueWords > 0
            ? STRINGS.COMPLETE_DUE_FIRST
            : wordCategories.strugglingWords > 0
            ? STRINGS.FOCUS_ON_STRUGGLING_FIRST
            : (typeof eligibleAllWordsCount === 'number' ? eligibleAllWordsCount : totalWords) === 0
            ? STRINGS.NO_WORDS_TO_STUDY
            : undefined,
        capacityPhase: 'green' as const,
      },
    ];

    const createCategoryPressHandler = useCallback(
      (category: StatCategory) => {
        return () => {
          onStartReview?.(category);
        };
      },
      [onStartReview]
    );

    return (
      <View style={styles.container}>
        <MemoryRetentionGauge studyWords={validatedInput.studyWords} onInfoPress={onInfoPress} />

        {categories.map(config => (
          <StatCard
            key={config.category}
            title={config.label}
            count={config.disabled ? 0 : config.value}
            onPress={config.disabled ? () => {} : createCategoryPressHandler(config.category)}
            disabled={config.disabled}
            testID={`start-review-${config.category}`}
          />
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
});

export default VocabularyStatCards;
