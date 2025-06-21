import { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { StatCategory, StudyWord } from '@/types/vocabulary.types';
import { isStrugglingWord } from '@/utils/wordClassification';

import { MemoryCapacityGauge } from './charts/MemoryCapacityGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onStatPress?: (category: StatCategory) => void;
  onStartReview?: (category: StatCategory) => void;
  studyWords?: StudyWord[];
}

interface WordCategoryConfig {
  value: number;
  label: string;
  iconColor: string;
  bgColor: string;
  category: StatCategory;
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
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
      const { studyWords, dueWords: _dueWords } = validatedInput;

      // Calculate due words from study words if not provided
      const now = new Date().toISOString();
      const calculatedDueWords = studyWords.filter(
        word => (word.fsrs_due ?? '9999-12-31') <= now
      ).length;

      // FIXED: Use server-side logic for learning words (matching session logic)
      // Server: 'fsrs_state.in.(0,1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)'
      const learningWords = studyWords.filter(word => {
        const state = word.fsrs_state;
        const stability = word.fsrs_stability ?? 0;
        return state === 0 || state === 1 || state === 3 || (state === 2 && stability < 5);
      }).length;

      // FIXED: Use server-side logic for mastered words (matching session logic)
      // Server: 'fsrs_state.eq.2,fsrs_stability.gte.5'
      const masteredWords = studyWords.filter(word => {
        const state = word.fsrs_state;
        const stability = word.fsrs_stability ?? 0;
        return state === 2 && stability >= 5;
      }).length;

      // FIXED: Only count struggling words that have been reviewed (matching session logic)
      // This ensures the display count matches what users will actually practice
      const strugglingWords = studyWords.filter(word => {
        // Must have been reviewed at least once (matching session's reviewedOnly: true)
        const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
        return hasBeenReviewed && isStrugglingWord(word);
      }).length;

      return {
        // Prioritize dueWords prop over calculated value for consistency
        dueWords: validatedInput.dueWords > 0 ? validatedInput.dueWords : calculatedDueWords,
        learningWords,
        strugglingWords,
        masteredWords,
      };
    }, [validatedInput.studyWords, validatedInput.dueWords]);

    // Create focused practice session cards
    const totalWords = validatedInput.studyWords.length;
    const categories: WordCategoryConfig[] = useMemo(() => {
      const cards = [];
      const hasDueWords = wordCategories.dueWords > 0;
      const hasChallengingWords = wordCategories.strugglingWords > 0;

      // Always show due words if available
      if (hasDueWords) {
        cards.push({
          value: wordCategories.dueWords,
          label: STRINGS.DUE_NOW,
          iconColor: colors.error,
          bgColor: colors.elevation1,
          category: 'due' as StatCategory,
          description: STRINGS.REGULAR_PRACTICE_FOR_SCHEDULED_WORDS,
        });
      }

      // Always show challenging words if available
      if (wordCategories.strugglingWords > 0) {
        cards.push({
          value: wordCategories.strugglingWords,
          label: STRINGS.CHALLENGING,
          iconColor: colors.warning,
          bgColor: colors.elevation1,
          category: 'needsAttention' as StatCategory,
          description: STRINGS.DRILL_DOWN_ON_CHALLENGING_WORDS,
          disabled: hasDueWords,
          disabledMessage: 'Complete due words first',
        });
      }

      // Always show all words option if user has words
      if (totalWords > 0) {
        cards.push({
          value: totalWords,
          label: STRINGS.ALL_WORDS,
          iconColor: colors.tint,
          bgColor: colors.elevation1,
          category: 'total' as StatCategory,
          description: STRINGS.ADDITIONAL_PRACTICE,
          disabled: hasDueWords || hasChallengingWords,
          disabledMessage: hasDueWords
            ? 'Complete due words first'
            : 'Complete challenging words first',
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
            activeOpacity={config.disabled ? 1 : 0.7}
            onPress={config.disabled ? undefined : () => onStartReview?.(config.category)}
            onPressIn={config.disabled ? undefined : handlePressIn}
            onPressOut={config.disabled ? undefined : handlePressOut}
            testID={`start-review-${config.category}`}
            style={config.disabled && styles.disabledCard}
          >
            <Animated.View
              style={[
                styles.categoryCard,
                { backgroundColor: config.bgColor },
                !config.disabled && (animatedStyle as ViewStyle),
                config.disabled && { opacity: 0.5 },
              ]}
            >
              {/* Number Badge */}
              <View
                style={[
                  styles.numberBadge,
                  { backgroundColor: config.disabled ? colors.secondaryText : config.iconColor },
                ]}
              >
                <ThemedText style={[styles.numberText, { color: colors.white }]}>
                  {config.value}
                </ThemedText>
              </View>

              {/* Content */}
              <View style={styles.categoryContent}>
                <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                <ThemedText
                  style={styles.categoryDescription}
                  type="caption"
                  variant={config.disabled ? 'secondary' : undefined}
                >
                  {config.disabled ? config.disabledMessage : config.description}
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
  disabledCard: {
    // Empty style object for disabled state
  },
});
