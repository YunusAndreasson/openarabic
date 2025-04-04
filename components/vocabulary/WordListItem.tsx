import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, ViewStyle } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { StudyWord } from '../../types/vocabulary.types';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { usePressAnimation } from '../../hooks/animations';
import { State } from 'ts-fsrs';
import { format } from 'date-fns';
import { router } from 'expo-router';

interface WordListItemProps {
  word: StudyWord;
  onPress: () => void;
  masteryScore?: number;
}

// Memoize the component to prevent unnecessary re-renders
const WordListItem = React.memo(function WordListItem({ word, onPress }: WordListItemProps) {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    scaleAmount: 0.97,
    opacityAmount: 0.95,
  });

  // Get the actual word data
  const { word_form, english, sentence } = word.sentence_word || {};

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

  // Handle navigation to the article
  const handlePress = () => {
    if (sentence?.article_id) {
      router.push({
        pathname: '/article/[id]',
        params: {
          id: sentence.article_id,
          scrollToSentence: sentence.id,
          highlightWord: word.sentence_word?.id,
          wordPosition: word.sentence_word?.position,
          scrollBehavior: 'smooth',
          highlight: 'true',
        },
      });
    } else {
      onPress(); // Fallback to default behavior
    }
  };

  // Return null early if there's no word data
  if (!word_form) return null;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
  ];

  // Get learning state label

  return (
    <Animated.View style={animatedStyle as AnimatedStyle<ViewStyle>}>
      <TouchableOpacity
        style={containerStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`Word: ${word_form}. English: ${english}.`}
        accessibilityHint="Tap to view in article context"
        accessibilityRole="button"
      >
        <View style={styles.cardContent}>
          {/* Main content row */}
          <View style={styles.content}>
            {/* Left side with English text and metadata */}
            <View style={styles.leftContent}>
              <View style={styles.textContainer}>
                {/* English translation with word type tag */}
                <View style={styles.translationRow}>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    weight="500"
                    numberOfLines={2}
                    style={styles.englishText}
                  >
                    {english || 'No translation available'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Arabic text on the right */}
            <View style={styles.arabicContainer}>
              <ThemedText
                type="arabic"
                arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
                weight="600"
                align="right"
                skipDefaultColor
                colorName="arabicText"
              >
                {word_form}
              </ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.overlay }]} />

          {/* Memory Strength label and progress bar */}
          <View style={styles.progressBarContainer}>
            {/* Memory Strength caption and percentage side by side */}
            <View style={styles.progressBarLabelContainer}>
              <ThemedText type="caption" variant="subtle" style={styles.memoryStrengthLabel}>
                MEMORY STRENGTH
              </ThemedText>
              <ThemedText type="caption" variant="subtle">
                {wordStatus.progress.value}%
              </ThemedText>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.overlay }]}>
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

            {/* Review info and streak below progress bar */}
            <View style={styles.learningInfoContainer}>
              {wordStatus.lastReview && (
                <ThemedText type="caption" variant="subtle" style={styles.lastReview}>
                  Next Review: {format(new Date(wordStatus.lastReview), 'MMM d')}
                </ThemedText>
              )}

              {wordStatus.successStreak > 0 && (
                <ThemedText type="caption" variant="subtle" style={styles.streakText}>
                  🔥 {wordStatus.successStreak} streak
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  arabicContainer: {
    alignItems: 'flex-end',
    flex: 0.5,
    justifyContent: 'center',
    minHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
  },
  cardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL * 0.75,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    width: '100%',
    ...LAYOUT.SHADOW.MEDIUM,
    marginVertical: LAYOUT.SPACING.SMALL / 4,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL / 2,
    minHeight: 36,
  },
  divider: {
    height: 1,
    marginVertical: LAYOUT.SPACING.SMALL / 2,
    opacity: 0.3,
    width: '100%',
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    lineHeight: Platform.OS === 'ios' ? 24 : 26,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  lastReview: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  learningInfoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.SMALL / 2,
  },
  leftContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  memoryStrengthLabel: {
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    height: 4,
    marginBottom: LAYOUT.SPACING.SMALL / 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarContainer: {
    marginTop: LAYOUT.SPACING.SMALL / 2,
  },
  progressBarLabelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL / 3,
  },
  progressFill: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    height: '100%',
  },
  streakText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  textContainer: {
    flex: 1,
  },
  translationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.SMALL / 2,
  },
});

export default WordListItem;
