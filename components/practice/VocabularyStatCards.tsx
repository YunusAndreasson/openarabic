/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { StatCategory, StudyWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';
import { calculateWordCategories } from '@/utils/wordClassification';

import { MemoryCapacityGauge } from './charts/MemoryCapacityGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
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
  capacityPhase: 'red' | 'yellow' | 'green';
}

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStartReview,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();
    const router = useRouter();
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
    });

    const handleInfoPress = useCallback(() => {
      router.push(ROUTE_PATHS.INSIGHTS);
    }, [router]);

    const validatedInput = useMemo(
      () => ({
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: Array.isArray(studyWords) ? studyWords : [],
      }),
      [masteredWords, learningWords, dueWords, studyWords]
    );

    const wordCategories = useMemo(() => {
      return calculateWordCategories(validatedInput.studyWords, validatedInput.dueWords);
    }, [validatedInput.studyWords, validatedInput.dueWords]);

    const totalWords = validatedInput.studyWords.length;
    const categories: WordCategoryConfig[] = useMemo(() => {
      const cards = [] as WordCategoryConfig[];
      const hasDueWords = wordCategories.dueWords > 0;

      cards.push({
        value: wordCategories.dueWords,
        label: STRINGS.URGENT_PRESERVATION,
        iconColor: colors.error,
        bgColor: colors.card,
        category: 'due' as StatCategory,
        description: STRINGS.URGENT_MEMORY_PRESERVATION,
        capacityPhase: 'red' as const,
        disabled: wordCategories.dueWords === 0,
        disabledMessage: wordCategories.dueWords === 0 ? 'No words due for review' : undefined,
      });

      cards.push({
        value: wordCategories.strugglingWords,
        label: STRINGS.EFFORTFUL_RETRIEVAL,
        iconColor: colors.warning,
        bgColor: colors.card,
        category: 'struggling' as StatCategory,
        description: STRINGS.EFFORTFUL_RETRIEVAL_PRACTICE,
        capacityPhase: 'yellow' as const,
        disabled: hasDueWords || wordCategories.strugglingWords === 0,
        disabledMessage: hasDueWords
          ? STRINGS.COMPLETE_DUE_FIRST
          : wordCategories.strugglingWords === 0
          ? 'Great! No struggling words to practice'
          : undefined,
      });

      cards.push({
        value: totalWords,
        label: STRINGS.INTERLEAVED_REVIEW,
        iconColor: colors.success,
        bgColor: colors.card,
        category: 'total' as StatCategory,
        description: STRINGS.INTERLEAVED_REVIEW_DESCRIPTION,
        capacityPhase: 'green' as const,
        disabled: hasDueWords || wordCategories.strugglingWords > 0 || totalWords === 0,
        disabledMessage: hasDueWords
          ? STRINGS.COMPLETE_DUE_FIRST
          : wordCategories.strugglingWords > 0
          ? STRINGS.FOCUS_ON_STRUGGLING_FIRST
          : totalWords === 0
          ? STRINGS.GET_STARTED_MESSAGE
          : undefined,
      });

      return cards;
    }, [wordCategories, colors, totalWords]);

    const getButtonBackground = (config: WordCategoryConfig) => {
      return config.bgColor;
    };

    const getBadgeColor = (config: WordCategoryConfig) => {
      if (config.disabled) {
        return `${config.iconColor}4D`;
      }
      return config.iconColor;
    };

    const getBadgeContent = (config: WordCategoryConfig) => {
      const displayValue = config.disabled ? 0 : config.value;
      return displayValue.toString();
    };

    const createCategoryPressHandler = useCallback(
      (category: StatCategory) => {
        return () => {
          selectionFeedback();
          onStartReview?.(category);
        };
      },
      [onStartReview]
    );

    return (
      <View style={styles.container}>
        <MemoryCapacityGauge studyWords={validatedInput.studyWords} onInfoPress={handleInfoPress} />

        {categories.map(config => (
          <TouchableOpacity
            key={config.category}
            activeOpacity={config.disabled ? 1 : 0.7}
            onPress={config.disabled ? undefined : createCategoryPressHandler(config.category)}
            onPressIn={config.disabled ? undefined : handlePressIn}
            onPressOut={config.disabled ? undefined : handlePressOut}
            testID={`start-review-${config.category}`}
            style={config.disabled && styles.disabledCard}
          >
            <View
              style={[
                styles.categoryCard,
                { backgroundColor: getButtonBackground(config) },
                !config.disabled && (animatedStyle as ViewStyle),
                config.disabled && { opacity: LAYOUT.OPACITY.HIGH },
              ]}
            >
              <View style={[styles.numberBadge, { backgroundColor: getBadgeColor(config) }]}>
                <ThemedText style={[styles.numberText, { color: colors.background }]}>
                  {getBadgeContent(config)}
                </ThemedText>
              </View>

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
    ...LAYOUT.ELEVATION.SMALL,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  numberBadge: {
    minWidth: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    minHeight: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.TINY,
    borderRadius: (MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL) / 2,
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
  disabledCard: {},
});

export default VocabularyStatCards;
