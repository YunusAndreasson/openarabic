import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { State } from 'ts-fsrs';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { StudyWord } from '../../types/vocabulary.types';
import { ThemedText } from '../ThemedText';

interface WordListItemProps {
  word: StudyWord;
  onPress?: () => void;
}

// Memoize the component to prevent unnecessary re-renders
const WordListItem = memo(function WordListItem({ word, onPress }: WordListItemProps) {
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

    // Get progress colors based on state and progress
    let progressColor: string;
    let statusIcon: string = 'school-outline';

    if (state === State.Review && progress >= 80) {
      progressColor = colors.success; // Mastered
      statusIcon = 'checkmark-circle-outline';
    } else if (state === State.Review && progress >= 50) {
      progressColor = colors.warning; // Learning well
      statusIcon = 'thumbs-up-outline';
    } else if (state === State.Learning || state === State.Relearning) {
      progressColor = colors.info; // In learning phase
      statusIcon = 'sync-outline';
    } else {
      progressColor = `${colors.info}40`; // New or early stage
      statusIcon = 'add-circle-outline';
    }

    const isNewWord = state === State.New;
    const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

    return {
      progress: {
        value: progress,
        color: progressColor,
        width: Math.max(5, progress),
      },
      isNewWord,
      lastReview,
      reviewCount: word.fsrs_reps || 0,
      successStreak: word.success_streak || 0,
      state,
      statusIcon,
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
    <View style={styles.cardContent}>
      {/* Main content row */}
      <View style={styles.content}>
        {/* Left side with English text */}
        <ThemedText
          type="body"
          variant="secondary"
          weight="semibold"
          numberOfLines={2}
          style={[styles.englishText, { fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE + 1 }]}
        >
          {capitalizedMeaning || 'No translation available'}
        </ThemedText>

        {/* Arabic text on the right */}
        <ThemedText
          type="arabic"
          arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE - 2}
          weight="semibold"
          align="right"
          skipDefaultColor
          colorName="arabicText"
          style={styles.arabicText}
        >
          {letters}
        </ThemedText>
      </View>

      {/* Memory Strength section */}
      <View style={styles.progressBarLabelContainer}>
        <ThemedText type="overline" variant="secondary" style={styles.progressLabel}>
          MEMORY STRENGTH
        </ThemedText>
        <ThemedText type="caption" variant="subtle" weight="semibold" style={styles.progressValue}>
          {wordStatus.progress.value}%
        </ThemedText>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.cardBorder }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${wordStatus.progress.width}%`,
              backgroundColor: wordStatus.progress.color.replace(/40$/, ''),
            },
          ]}
        />
      </View>

      {/* Review info and streak below progress bar */}
      <View style={styles.learningInfoContainer}>
        {wordStatus.lastReview ? (
          <ThemedText type="caption" variant="subtle" weight="normal" style={styles.lastReview}>
            Next Review: {format(new Date(wordStatus.lastReview), 'MMM d')}
          </ThemedText>
        ) : null}

        {wordStatus.successStreak > 0 ? (
          <ThemedText type="caption" variant="subtle" weight="medium" style={styles.streakText}>
            🔥 {wordStatus.successStreak} streak
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  arabicText: {
    flex: 0.5,
    textAlign: 'right',
  },
  cardContent: {
    padding: LAYOUT.SPACING.MEDIUM + 2,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL + 2,
    minHeight: 38,
  },
  divider: {
    height: 1,
    marginVertical: LAYOUT.SPACING.SMALL / 2,
    opacity: 0.3,
    width: '100%',
  },
  englishText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: Platform.OS === 'ios' ? 26 : 28,
    marginRight: LAYOUT.SPACING.MEDIUM + 2,
  },
  lastReview: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  learningInfoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.SMALL,
    minHeight: 16,
  },
  progressBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL / 2,
    height: 5,
    marginBottom: LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarLabelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL / 2,
  },
  progressFill: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL / 2,
    height: '100%',
  },
  progressLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 0.5,
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  streakText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

export default WordListItem;
