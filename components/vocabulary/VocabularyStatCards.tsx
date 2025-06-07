import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { getStrugglingWordsCount } from '@/utils/wordClassification';

import { LAYOUT } from '../../constants/layout';
import { useAuth } from '../../hooks/auth/useAuth';
import { useColors } from '../../hooks/theme/useColors';
import { useVocabularyChartData } from '../../hooks/vocabulary/useVocabularyChartData';

import { InfoModal, type InfoModalType } from './InfoModal';
import { MemoryCapacityGauge } from './charts/MemoryCapacityGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onStatPress?: (category: StatCategory) => void;
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
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();
    const { user } = useAuth();
    const [modalType, setModalType] = useState<InfoModalType | null>(null);

    // Get optimized chart data from database views
    useVocabularyChartData(user?.id);

    // Validate input data with safe defaults
    const validatedInput = useMemo(
      () => ({
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: Array.isArray(studyWords) ? studyWords : [],
      }),
      [masteredWords, learningWords, dueWords, studyWords]
    );

    // Calculate comprehensive word categories for exploration
    const wordCategories = useMemo(() => {
      const studyWords = validatedInput.studyWords;

      if (!studyWords.length) {
        return {
          dueWords: 0,
          learningWords: 0,
          strugglingWords: 0,
          recentlyAdded: 0,
          masteredWords: 0,
          longTermRetention: 0,
        };
      }

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

      const recentlyAdded = studyWords.filter(word => {
        if (!word.created_at) return false;
        return new Date(word.created_at) >= oneWeekAgo;
      }).length;

      const masteredWords = studyWords.filter(word => {
        const stability = word.fsrs_stability || 0;
        const difficulty = word.fsrs_difficulty || 5;
        // Well-established words with good stability (lowered threshold for better UX)
        return stability >= 7 && difficulty <= 5;
      }).length;

      const longTermRetention = studyWords.filter(word => {
        const stability = word.fsrs_stability || 0;
        const createdAt = word.created_at ? new Date(word.created_at) : null;
        // Words that have been mastered for over a month and are stable
        return stability >= 30 && createdAt && createdAt <= oneMonthAgo;
      }).length;

      return {
        dueWords,
        learningWords,
        strugglingWords,
        recentlyAdded,
        masteredWords,
        longTermRetention,
      };
    }, [validatedInput.studyWords]);

    // Handle info modal - memoized for performance

    const handleCloseModal = useCallback(() => {
      setModalType(null);
    }, []);

    // Create smart category configuration - organized by learning priority and grouped logically
    const primaryCategories: WordCategoryConfig[] = useMemo(
      () => [
        // PRIMARY GROUP: Immediate Action Needed (most important)
        {
          value: wordCategories.dueWords,
          label: 'Due for Review',
          iconColor: colors.error,
          bgColor: colors.buttonOverlay,
          category: 'due',
          description: 'Words scheduled for review now',
        },
        {
          value: wordCategories.strugglingWords,
          label: 'Challenging',
          iconColor: colors.warning,
          bgColor: colors.buttonOverlay,
          category: 'needsAttention',
          description: 'Words that need extra attention',
        },
      ],
      [wordCategories, colors]
    );

    const progressCategories: WordCategoryConfig[] = useMemo(
      () => [
        // PROGRESS GROUP: Learning Status (secondary importance)
        {
          value: wordCategories.learningWords,
          label: 'In Progress',
          iconColor: colors.info,
          bgColor: colors.buttonOverlay,
          category: 'learning',
          description: 'Words you are actively learning',
        },
        {
          value: wordCategories.masteredWords + wordCategories.longTermRetention,
          label: 'Strong',
          iconColor: colors.success,
          bgColor: colors.buttonOverlay,
          category: 'mastered',
          description: 'Words you have successfully learned',
        },
      ],
      [wordCategories, colors]
    );

    const activityCategories: WordCategoryConfig[] = useMemo(
      () => [
        // ACTIVITY GROUP: Recent Activity (tertiary importance)
        {
          value: wordCategories.recentlyAdded,
          label: 'Recently Added',
          iconColor: colors.tint,
          bgColor: colors.buttonOverlay,
          category: 'total',
          description: 'Words added in the last week',
        },
      ],
      [wordCategories, colors]
    );

    // Memoized info press handlers to prevent unnecessary re-renders

    return (
      <View style={styles.container}>
        {/* Memory Capacity Gauge - Top Priority */}
        <View style={styles.section}>
          <SectionTitle isFirstSection={true} title="Memory Capacity" />
          <MemoryCapacityGauge studyWords={validatedInput.studyWords} onStatPress={onStatPress} />
        </View>

        {/* Word Categories - Clean exploration interface with grouped sections */}
        <View style={styles.section}>
          <SectionTitle title="Explore Your Words" />

          {/* Primary Actions - Most Important */}
          {primaryCategories.some(config => config.value > 0) && (
            <View style={styles.categoryGroup}>
              <ThemedText style={styles.groupLabel} type="caption" variant="secondary">
                REQUIRES ATTENTION
              </ThemedText>
              <View style={styles.categoriesList}>
                {primaryCategories
                  .filter(config => config.value > 0)
                  .map(config => (
                    <TouchableOpacity
                      key={config.category}
                      accessibilityLabel={`Browse ${config.label}: ${config.value} words`}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      style={[styles.categoryRow, { backgroundColor: config.bgColor }]}
                      onPress={() => onStatPress?.(config.category)}
                    >
                      {/* Number Badge */}
                      <View style={[styles.numberBadge, { backgroundColor: config.iconColor }]}>
                        <ThemedText style={styles.numberText}>{config.value}</ThemedText>
                      </View>

                      {/* Content */}
                      <View style={styles.categoryContent}>
                        <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                        <ThemedText
                          style={styles.categoryDescription}
                          type="caption"
                          variant="secondary"
                        >
                          {config.description}
                        </ThemedText>
                      </View>

                      {/* Chevron */}
                      <Ionicons
                        color={colors.secondaryText}
                        name="chevron-forward"
                        size={16}
                        style={styles.chevron}
                      />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          {/* Progress Overview - Learning Status */}
          <View style={styles.categoryGroup}>
            <ThemedText style={styles.groupLabel} type="caption" variant="secondary">
              LEARNING PROGRESS
            </ThemedText>
            <View style={styles.categoriesList}>
              {progressCategories
                .filter(config => config.value > 0 || config.category === 'mastered') // Always show mastered
                .map(config => (
                  <TouchableOpacity
                    key={config.category}
                    accessibilityLabel={`Browse ${config.label}: ${config.value} words`}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    style={[styles.categoryRow, { backgroundColor: config.bgColor }]}
                    onPress={() => onStatPress?.(config.category)}
                  >
                    {/* Number Badge */}
                    <View style={[styles.numberBadge, { backgroundColor: config.iconColor }]}>
                      <ThemedText style={styles.numberText}>{config.value}</ThemedText>
                    </View>

                    {/* Content */}
                    <View style={styles.categoryContent}>
                      <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                      <ThemedText
                        style={styles.categoryDescription}
                        type="caption"
                        variant="secondary"
                      >
                        {config.description}
                      </ThemedText>
                    </View>

                    {/* Chevron */}
                    <Ionicons
                      color={colors.secondaryText}
                      name="chevron-forward"
                      size={16}
                      style={styles.chevron}
                    />
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Recent Activity - Optional/Tertiary */}
          {activityCategories.some(config => config.value > 0) && (
            <View style={styles.categoryGroup}>
              <ThemedText style={styles.groupLabel} type="caption" variant="secondary">
                RECENT ACTIVITY
              </ThemedText>
              <View style={styles.categoriesList}>
                {activityCategories
                  .filter(config => config.value > 0)
                  .map(config => (
                    <TouchableOpacity
                      key={config.category}
                      accessibilityLabel={`Browse ${config.label}: ${config.value} words`}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      style={[styles.categoryRow, { backgroundColor: config.bgColor }]}
                      onPress={() => onStatPress?.(config.category)}
                    >
                      {/* Number Badge */}
                      <View style={[styles.numberBadge, { backgroundColor: config.iconColor }]}>
                        <ThemedText style={styles.numberText}>{config.value}</ThemedText>
                      </View>

                      {/* Content */}
                      <View style={styles.categoryContent}>
                        <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                        <ThemedText
                          style={styles.categoryDescription}
                          type="caption"
                          variant="secondary"
                        >
                          {config.description}
                        </ThemedText>
                      </View>

                      {/* Chevron */}
                      <Ionicons
                        color={colors.secondaryText}
                        name="chevron-forward"
                        size={16}
                        style={styles.chevron}
                      />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
        </View>

        {/* Info Modal */}
        <InfoModal type={modalType} visible={modalType !== null} onClose={handleCloseModal} />
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  categoriesList: {
    gap: LAYOUT.SPACING.SMALL,
  },
  categoryContent: {
    flex: 1,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
  },
  categoryGroup: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryRow: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  chevron: {
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: 0.6,
  },
  container: {
    flex: 1,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  numberBadge: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 32,
  },
  numberText: {
    color: Colors.light.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
