/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 *
 * 3-PHASE COLOR SYSTEM:
 * 🔴 RED PHASE (Due Words): Urgent memory preservation - highest priority for retention
 * 🟡 YELLOW PHASE (Challenging Words): Effortful retrieval for memory consolidation
 * 🟢 GREEN PHASE (All Words): Mixed practice when capacity allows
 *
 * SCIENTIFIC FOUNDATION:
 * - Based on FSRS algorithm's stability, difficulty, and retrievability metrics
 * - Follows spacing effect principles for optimal memory retention
 * - Implements desirable difficulty theory for enhanced learning
 * - Uses traffic light metaphor for intuitive UX (Jakob's Law)
 *
 * DESIGN PRINCIPLES:
 * - Faint opacity for disabled states preserves visual language
 * - Color coordination with Memory Capacity Gauge state
 * - Follows Hick's Law with 3 clear, distinct choices
 * - Implements Fitts' Law with large touch targets
 */

import { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

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
  capacityPhase: 'red' | 'yellow' | 'green';
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

    // Memory capacity coordination is handled by MemoryCapacityGauge component

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

    // Create scientifically-grounded practice session cards coordinated with Memory Capacity Gauge
    const totalWords = validatedInput.studyWords.length;
    const categories: WordCategoryConfig[] = useMemo(() => {
      const cards = [];
      const hasDueWords = wordCategories.dueWords > 0;

      // Coordinate with Memory Capacity Gauge state (75% = green phase)
      // The gauge determines the overall capacity state, buttons follow that guidance

      // RED PHASE: Due words (urgent memory preservation)
      // Always show due words card - highest priority for memory retention
      cards.push({
        value: wordCategories.dueWords,
        label: STRINGS.URGENT_PRESERVATION,
        iconColor: colors.error, // Use semantic error color for consistency with tab badges
        bgColor: colors.elevation1,
        category: 'due' as StatCategory,
        description: STRINGS.URGENT_MEMORY_PRESERVATION,
        capacityPhase: 'red' as const,
        // Due words disabled only when there are none to practice
        disabled: wordCategories.dueWords === 0,
        disabledMessage: wordCategories.dueWords === 0 ? 'No words due' : undefined,
      });

      // YELLOW PHASE: Struggling words (effortful retrieval for memory consolidation)
      cards.push({
        value: wordCategories.strugglingWords,
        label: STRINGS.EFFORTFUL_RETRIEVAL,
        iconColor: colors.warning, // Use semantic warning color for consistency with tab badges
        bgColor: colors.elevation1,
        category: 'struggling' as StatCategory,
        description: STRINGS.EFFORTFUL_RETRIEVAL_PRACTICE,
        capacityPhase: 'yellow' as const,
        // Struggling words disabled when due words take priority OR when none exist
        disabled: hasDueWords || wordCategories.strugglingWords === 0,
        disabledMessage: hasDueWords
          ? STRINGS.COMPLETE_DUE_FIRST
          : wordCategories.strugglingWords === 0
          ? 'No struggling words found'
          : undefined,
      });

      // GREEN PHASE: Mixed practice (interleaved review for robust learning)
      cards.push({
        value: totalWords,
        label: STRINGS.INTERLEAVED_REVIEW,
        iconColor: colors.success, // Use semantic success color for consistency with tab badges
        bgColor: colors.elevation1,
        category: 'all' as StatCategory,
        description: STRINGS.INTERLEAVED_REVIEW_DESCRIPTION,
        capacityPhase: 'green' as const,
        // All words disabled when due words OR struggling words take priority
        disabled: hasDueWords || wordCategories.strugglingWords > 0,
        disabledMessage: hasDueWords
          ? STRINGS.COMPLETE_DUE_FIRST
          : wordCategories.strugglingWords > 0
          ? STRINGS.FOCUS_ON_STRUGGLING_FIRST
          : totalWords === 0
          ? 'No words available'
          : undefined,
      });

      return cards;
    }, [wordCategories, colors, totalWords]);

    // Get color-coordinated background for button state
    const getButtonBackground = (config: WordCategoryConfig) => {
      // Always use the standard elevation background for the card
      // Color coordination is only applied to the badge/circle
      return config.bgColor;
    };

    // Get badge color with proper disabled state and color coordination
    const getBadgeColor = (config: WordCategoryConfig) => {
      if (config.disabled) {
        // Use consistent opacity system for disabled state
        return `${config.iconColor}4D`; // 30% opacity in hex (4D = 77/255 ≈ 30%)
      }
      return config.iconColor;
    };

    // Get badge content - hide count for disabled cards to avoid confusion
    const getBadgeContent = (config: WordCategoryConfig) => {
      if (config.disabled && config.value === 0) {
        return '—'; // No words available
      }
      if (config.disabled) {
        return '—'; // Words exist but not actionable right now
      }
      return config.value.toString();
    };

    return (
      <View style={styles.container}>
        {/* Memory Capacity Gauge - scientifically grounded with color coordination */}
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
            <View
              style={[
                styles.categoryCard,
                { backgroundColor: getButtonBackground(config) },
                !config.disabled && (animatedStyle as ViewStyle),
                config.disabled && { opacity: 0.7 }, // Slightly reduced opacity for disabled state
              ]}
            >
              {/* Color-coordinated number badge */}
              <View style={[styles.numberBadge, { backgroundColor: getBadgeColor(config) }]}>
                <ThemedText style={[styles.numberText, { color: colors.background }]}>
                  {getBadgeContent(config)}
                </ThemedText>
              </View>

              {/* Content with proper disabled styling */}
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
