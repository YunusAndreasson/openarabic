import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { StudyWord } from '../types/vocabulary.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../hooks/animations';
import { Ionicons } from '@expo/vector-icons';
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
    const dueDate = new Date(word.fsrs_due);
    const now = new Date();
    const isOverdue = dueDate <= now;
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Normalized progress (0-100)
    const progress = Math.min(100, Math.round((stability / 60) * 100));

    // Due date info
    let dueInfo = null;
    if (state !== State.New) {
      if (isOverdue) {
        dueInfo = {
          text: 'Due Now',
          color: colors.error,
          icon: 'time-outline',
        };
      } else if (daysUntilDue === 0) {
        dueInfo = {
          text: 'Today',
          color: colors.warning,
          icon: 'today-outline',
        };
      } else if (daysUntilDue === 1) {
        dueInfo = {
          text: 'Tomorrow',
          color: colors.warning,
          icon: 'calendar-outline',
        };
      } else if (daysUntilDue <= 7) {
        dueInfo = {
          text: `${daysUntilDue} days`,
          color: colors.text,
          icon: 'calendar-outline',
        };
      }
    }

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
      dueInfo,
      progress: {
        value: progress,
        color: progressColor,
        width: Math.max(5, progress), // Minimum 5% width for visibility
      },
      isNewWord,
    };
  }, [word.fsrs_stability, word.fsrs_state, word.fsrs_due, colors]);

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

  const hasStreak = (word.success_streak ?? 0) > 0;

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
          {/* Status indicators in a minimal style */}
          <View style={styles.statusRow}>
            {wordStatus.dueInfo && (
              <View
                style={[styles.statusPill, { backgroundColor: `${wordStatus.dueInfo.color}15` }]}
              >
                <Ionicons
                  name={wordStatus.dueInfo.icon as any}
                  size={12}
                  color={wordStatus.dueInfo.color}
                  style={styles.statusIcon}
                />
                <ThemedText
                  type="caption"
                  style={[styles.statusText, { color: wordStatus.dueInfo.color }]}
                  skipDefaultColor
                >
                  {wordStatus.dueInfo.text}
                </ThemedText>
              </View>
            )}

            {hasStreak && (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: `${(word.success_streak ?? 0) >= 3 ? colors.success : colors.warning}15`,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  weight="500"
                  style={[
                    styles.statusText,
                    { color: (word.success_streak ?? 0) >= 3 ? colors.success : colors.warning },
                  ]}
                  skipDefaultColor
                >
                  {word.success_streak}× streak
                </ThemedText>
              </View>
            )}
          </View>

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
            <View
              style={[
                styles.progressBar,
                wordStatus.isNewWord ? { backgroundColor: `${colors.info}20` } : undefined,
              ]}
            >
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
    marginVertical: LAYOUT.SPACING.SMALL / 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.TINY / 2,
  },
  statusIcon: {
    marginRight: 3,
  },
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    minHeight: 50,
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    lineHeight: Platform.OS === 'ios' ? 22 : 26,
  },
  progressBarContainer: {
    marginVertical: LAYOUT.SPACING.SMALL,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default WordListItem;
