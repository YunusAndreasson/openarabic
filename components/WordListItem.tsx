import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import { StudyWord } from '../types/vocabulary.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../hooks/animations';
import { Ionicons } from '@expo/vector-icons';
import { State } from 'ts-fsrs'; // Import State enum

interface WordListItemProps {
  word: StudyWord;
  onPress: () => void;
  masteryScore?: number; // Optional mastery score from 0-100
}

// Define variants for ThemedText
type TextVariant =
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'disabled'
  | undefined;

// Memoize the component to prevent unnecessary re-renders
const WordListItem = React.memo(function WordListItem({
  word,
  onPress,
  masteryScore,
}: WordListItemProps) {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    scaleAmount: 0.97,
    opacityAmount: 0.95,
  });

  // Get the actual word data
  const { word_form, english } = word.sentence_word || {};

  // Get mastery information using FSRS metrics
  const masteryInfo = useMemo(() => {
    if (masteryScore === undefined) return null;

    if (masteryScore >= 80) {
      return {
        color: colors.success as any,
        iconName: 'star' as any,
        label: 'Mastered',
        variant: 'success' as TextVariant,
      };
    } else if (masteryScore >= 40) {
      return {
        color: colors.warning as any,
        iconName: 'star-half-outline' as any,
        label: 'Learning',
        variant: 'warning' as TextVariant,
      };
    } else {
      return {
        color: colors.error as any,
        iconName: 'star-outline' as any,
        label: 'New',
        variant: 'error' as TextVariant,
      };
    }
  }, [masteryScore, colors]);

  // Calculate review status based on FSRS parameters
  const reviewInfo = useMemo(() => {
    // Use FSRS state for base information
    const state = word.fsrs_state;
    const stability = word.fsrs_stability || 0;
    const dueDate = new Date(word.fsrs_due);
    const now = new Date();
    const isOverdue = dueDate <= now;
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Handle different FSRS states
    switch (state) {
      case State.New:
        return {
          text: 'New',
          color: colors.info,
          icon: 'add-circle-outline' as const,
          variant: 'info' as TextVariant,
        };

      case State.Learning:
        return {
          text: 'Learning',
          color: colors.warning as any,
          icon: 'school-outline' as const,
          variant: 'warning' as TextVariant,
        };

      case State.Review:
        // For Review state, show due status
        if (isOverdue) {
          return {
            text: 'Due now',
            color: colors.error as any,
            icon: 'alert-circle-outline' as const,
            variant: 'error' as TextVariant,
          };
        } else if (daysUntilDue === 0) {
          return {
            text: 'Due today',
            color: colors.warning as any,
            icon: 'today-outline' as const,
            variant: 'warning' as TextVariant,
          };
        } else if (daysUntilDue === 1) {
          return {
            text: 'Due tomorrow',
            color: colors.warning as any,
            icon: 'calendar-outline' as const,
            variant: 'warning' as TextVariant,
          };
        } else if (daysUntilDue <= 7) {
          return {
            text: `Due in ${daysUntilDue} days`,
            color: colors.text,
            icon: 'calendar-outline' as const,
            variant: undefined as TextVariant,
          };
        } else {
          // For longer intervals, use weeks
          const weeks = Math.floor(daysUntilDue / 7);
          const remainingDays = daysUntilDue % 7;

          if (weeks === 1 && remainingDays === 0) {
            return {
              text: 'Due in 1 week',
              color: colors.text,
              icon: 'calendar-outline' as const,
              variant: undefined as TextVariant,
            };
          } else if (remainingDays === 0) {
            return {
              text: `Due in ${weeks} weeks`,
              color: colors.text,
              icon: 'calendar-outline' as const,
              variant: undefined as TextVariant,
            };
          } else {
            return {
              text: `Due in ${weeks}w ${remainingDays}d`,
              color: colors.text,
              icon: 'calendar-outline' as const,
              variant: undefined as TextVariant,
            };
          }
        }

      case State.Relearning:
        return {
          text: 'Relearning',
          color: colors.error as any,
          icon: 'refresh-circle-outline' as const,
          variant: 'error' as TextVariant,
        };

      default:
        return {
          text: 'Unknown',
          color: colors.text,
          icon: 'help-circle-outline' as const,
          variant: undefined as TextVariant,
        };
    }
  }, [word.fsrs_state, word.fsrs_stability, word.fsrs_due, colors]);

  // Get streak information
  const streakCount = word.success_streak || 0;
  const streakColor = streakCount > 0 ? (colors.warning as any) : colors.text;
  const streakVariant: TextVariant = streakCount > 0 ? 'warning' : undefined;

  // Return null early if there's no word data, after all hooks are called
  if (!word_form) return null;

  // Optimize the container style to avoid style recalculation on each render
  const containerStyle = [
    styles.container,
    { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
  ];

  return (
    <Animated.View style={animatedStyle as any}>
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
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

        {/* Status bar at bottom */}
        <View style={styles.statusBar}>
          {/* Left side - Review timing */}
          {reviewInfo && (
            <View style={styles.statusItem}>
              <Ionicons
                name={reviewInfo.icon}
                size={14}
                color={reviewInfo.color}
                style={styles.statusIcon}
              />
              <ThemedText
                type="caption"
                variant={reviewInfo.variant}
                weight="500"
                style={styles.statusTextBase}
              >
                {reviewInfo.text}
              </ThemedText>
            </View>
          )}

          {/* Center - Mastery indicator */}
          {masteryInfo && (
            <View style={styles.statusItem}>
              <Ionicons
                name={masteryInfo.iconName}
                size={14}
                color={masteryInfo.color}
                style={styles.statusIcon}
              />
              <ThemedText
                type="caption"
                variant={masteryInfo.variant}
                weight="500"
                style={styles.statusTextBase}
              >
                {masteryInfo.label}
              </ThemedText>
            </View>
          )}

          {/* Right - Streak counter - Always show, even for 0 */}
          <View style={styles.statusItem}>
            <Ionicons name="flame" size={14} color={streakColor} style={styles.statusIcon} />
            <ThemedText
              type="caption"
              variant={streakVariant}
              weight="500"
              style={styles.statusTextBase}
            >
              {streakCount} streak
            </ThemedText>
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
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginVertical: LAYOUT.SPACING.TINY / 2,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
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
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.TINY / 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  statusIcon: {
    marginRight: 3,
  },
  statusTextBase: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
});

export default WordListItem;
