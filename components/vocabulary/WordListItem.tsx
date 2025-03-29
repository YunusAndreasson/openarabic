import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { StudyWord } from '../../types/vocabulary.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../../hooks/animations';
import { State } from 'ts-fsrs';

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
  const { word_form, english } = word.sentence_word || {};

  // Calculate learning progress and status
  const wordStatus = useMemo(() => {
    // Get FSRS data
    const stability = word.fsrs_stability || 0;
    const state = word.fsrs_state;

    // Normalized progress (0-100)
    // Use the same calculation logic as in calculateRetentionScore from wordList.tsx
    const stabilityScore = Math.min(stability / 100, 1) * 70;
    const difficultyFactor = 1 - word.fsrs_difficulty;
    const difficultyScore = difficultyFactor * 20;
    const lapsesPenalty = Math.min(word.fsrs_lapses / 10, 1) * 10;

    const progress = Math.max(
      0,
      Math.min(100, Math.round(stabilityScore + difficultyScore - lapsesPenalty))
    );

    // Get progress colors
    let progressColor: string;
    if (progress >= 80) {
      progressColor = colors.success;
    } else if (progress >= 50) {
      progressColor = colors.warning;
    } else if (progress >= 20) {
      progressColor = colors.info;
    } else if (progress > 0) {
      progressColor = colors.info;
    } else {
      // For zero progress (new words), use a light color instead of nothing
      progressColor = `${colors.info}40`;
    }

    const isNewWord = state === State.New;

    return {
      progress: {
        value: progress,
        color: progressColor,
        width: Math.max(5, progress), // Minimum 5% width for visibility
      },
      isNewWord,
    };
  }, [word.fsrs_stability, word.fsrs_state, word.fsrs_difficulty, word.fsrs_lapses, colors]);

  // Return null early if there's no word data, after all hooks are called
  if (!word_form) return null;

  // Optimize the container style to avoid style recalculation on each render
  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
  ];

  return (
    <Animated.View style={animatedStyle as any}>
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`Word: ${word_form}. English: ${english}.`}
        accessibilityHint="Tap to practice this word"
        accessibilityRole="button"
      >
        <View style={styles.cardContent}>
          {/* Main content row */}
          <View style={styles.content}>
            {/* Left side with English text */}
            <View style={styles.leftContent}>
              <View style={styles.textContainer}>
                {/* English translation */}
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

          {/* Memory Strength label and progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarLabelContainer}>
              <ThemedText type="overline" variant="subtle">
                MEMORY STRENGTH
              </ThemedText>
              <ThemedText type="caption" variant="subtle">
                {wordStatus.progress.value}%
              </ThemedText>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.overlay }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${wordStatus.progress.width}%`,
                    backgroundColor: wordStatus.progress.color,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM,
    marginVertical: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    minHeight: 40,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  textContainer: {
    flex: 1,
  },
  arabicContainer: {
    flex: 0.5,
    alignItems: 'flex-end',
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    lineHeight: Platform.OS === 'ios' ? 20 : 24,
  },
  progressBarContainer: {
    marginVertical: LAYOUT.SPACING.SMALL / 2,
  },
  progressBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    width: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.XSMALL / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.XSMALL / 2,
  },
});

export default WordListItem;
