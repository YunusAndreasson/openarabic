import { format } from 'date-fns';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { State } from 'ts-fsrs';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { StudyWord } from '../../types/vocabulary.types';
import { ThemedText } from '../ThemedText';

interface WordListItemProps {
  word: StudyWord;
}

// Memoize the component to prevent unnecessary re-renders
const WordListItem = memo(function WordListItem({ word }: WordListItemProps) {
  const colors = useColors();

  // Get the actual word data from root
  const letters = word.root?.letters || '';
  const meaning = word.root?.meaning || '';

  // Capitalize first letter of meaning
  const capitalizedMeaning = meaning ? meaning.charAt(0).toUpperCase() + meaning.slice(1) : '';

  // Calculate learning progress and status
  const wordStatus = useMemo(() => {
    // Get FSRS data
    const stability = word.fsrs_stability || 0;
    const state = word.fsrs_state;

    // Calculate memory strength based on FSRS stability
    const progress = Math.min(100, Math.round((Math.log2(1 + stability) / Math.log2(366)) * 100));

    // Get progress colors based on memory strength percentage (0-100%)
    let progressColor: string;
    let statusText: string;

    // Use a gradient from weak to strong memory retention
    if (progress >= 80) {
      progressColor = colors.success; // Strong memory (green)
      statusText = 'Mastered';
    } else if (progress >= 60) {
      progressColor = colors.tint; // Good memory (vibrant action green)
      statusText = 'Strong';
    } else if (progress >= 40) {
      progressColor = colors.warning; // Moderate memory (yellow/orange)
      statusText = 'Learning';
    } else if (progress >= 20) {
      progressColor = colors.warning; // Weak memory (organic gold)
      statusText = 'Weak';
    } else {
      progressColor = colors.error; // Very weak/new (red)
      statusText = 'New';
    }

    const isNewWord = state === State.New;
    const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

    return {
      progress: {
        value: progress,
        color: progressColor,
        width: Math.max(8, progress),
      },
      isNewWord,
      lastReview,
      reviewCount: word.fsrs_reps || 0,
      successStreak: word.success_streak || 0,
      state,
      statusText,
    };
  }, [
    word.fsrs_stability,
    word.fsrs_state,
    word.fsrs_last_review,
    word.fsrs_reps,
    word.success_streak,
    colors,
  ]);

  // Return null early if there's no word data
  if (!letters) return null;

  return (
    <View style={styles.container}>
      {/* Primary Content - Word and Translation */}
      <View style={styles.mainContent}>
        {/* English meaning - Primary hierarchy */}
        <View style={styles.meaningContainer}>
          <ThemedText type="heading3" weight="bold" numberOfLines={2} style={styles.meaningText}>
            {capitalizedMeaning || 'No translation available'}
          </ThemedText>
        </View>

        {/* Arabic text and navigation indicator */}
        <View style={styles.rightContent}>
          <View style={styles.arabicContainer}>
            <ThemedText
              type="arabic"
              arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE + 4}
              weight="bold"
              align="right"
              skipDefaultColor
              colorName="arabicText"
              style={styles.arabicText}
            >
              {letters}
            </ThemedText>
          </View>

          {/* Navigation indicator */}
          <View style={styles.navigationContainer}>
            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={colors.textTertiary}
              style={styles.navigationIcon}
            />
          </View>
        </View>
      </View>

      {/* Secondary Content - Progress and Status */}
      <View style={styles.progressSection}>
        {/* Progress header with status */}
        <View style={styles.progressHeader}>
          <View style={styles.progressLabelContainer}>
            <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
              Memory Strength
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: colors.socialIconBg }]}>
              <ThemedText
                type="caption"
                weight="semibold"
                style={[styles.statusText, { color: wordStatus.progress.color }]}
              >
                {wordStatus.statusText}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" variant="subtle" weight="bold" style={styles.progressValue}>
            {wordStatus.progress.value}%
          </ThemedText>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.borderOverlay }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${wordStatus.progress.width}%`,
                backgroundColor: wordStatus.progress.color,
              },
            ]}
          />
        </View>

        {/* Tertiary Content - Review info and streak */}
        {(wordStatus.lastReview || wordStatus.successStreak > 0) && (
          <View style={styles.metaInfo}>
            {wordStatus.lastReview && (
              <ThemedText type="caption" variant="subtle" style={styles.lastReview}>
                Last: {format(new Date(wordStatus.lastReview), 'MMM d')}
              </ThemedText>
            )}

            {wordStatus.successStreak > 0 && (
              <View style={styles.streakContainer}>
                <ThemedText
                  type="caption"
                  variant="subtle"
                  weight="medium"
                  style={styles.streakText}
                >
                  🔥 {wordStatus.successStreak}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    gap: LAYOUT.SPACING.LARGE,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  meaningContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  meaningText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
    opacity: 0.9,
  },
  arabicContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.TINY,
    minHeight: 36,
  },
  arabicText: {
    textAlign: 'right',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.4,
  },
  progressSection: {
    gap: LAYOUT.SPACING.SMALL,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  progressLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 0.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XTINY,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    letterSpacing: 0.2,
  },
  progressValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  progressBar: {
    height: 6,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.TINY,
  },
  lastReview: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  navigationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationIcon: {
    opacity: 0.6,
  },
});

export default WordListItem;
