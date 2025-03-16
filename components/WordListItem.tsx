import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import { StudyWord } from '../types/vocabulary.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../hooks/animations';
import { Ionicons } from '@expo/vector-icons';

interface WordListItemProps {
  word: StudyWord;
  onPress: () => void;
  masteryScore?: number; // Optional mastery score from 0-100
}

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

  // Get mastery information
  const masteryInfo = useMemo(() => {
    if (masteryScore === undefined) return null;

    if (masteryScore >= 80) {
      return {
        color: colors.success as any,
        iconName: 'star' as any,
        label: 'Mastered',
      };
    } else if (masteryScore >= 40) {
      return {
        color: colors.warning as any,
        iconName: 'star-half-outline' as any,
        label: 'Learning',
      };
    } else {
      return {
        color: colors.error as any,
        iconName: 'star-outline' as any,
        label: 'New',
      };
    }
  }, [masteryScore, colors]);

  // Get review timing information
  const reviewInfo = useMemo(() => {
    const days = word.interval_days;
    if (days === undefined) return null;

    if (days === 0)
      return {
        text: 'New',
        color: colors.text,
        icon: 'add-circle-outline' as const,
      };

    if (days === 1)
      return {
        text: 'Due today',
        color: colors.warning as any,
        icon: 'time' as const,
      };

    if (days === 2)
      return {
        text: 'Due tomorrow',
        color: colors.warning as any,
        icon: 'calendar-outline' as const,
      };

    if (days <= 7)
      return {
        text: `Due in ${days} days`,
        color: colors.text,
        icon: 'calendar-outline' as const,
      };

    // For longer intervals, use weeks
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;

    if (weeks === 1 && remainingDays === 0)
      return {
        text: 'Due in 1 week',
        color: colors.text,
        icon: 'calendar-outline' as const,
      };

    if (remainingDays === 0)
      return {
        text: `Due in ${weeks} weeks`,
        color: colors.text,
        icon: 'calendar-outline' as const,
      };

    return {
      text: `Due in ${weeks}w ${remainingDays}d`,
      color: colors.text,
      icon: 'calendar-outline' as const,
    };
  }, [word.interval_days, colors]);

  // Get streak information
  const streakCount = word.success_streak || 0;
  const streakColor = streakCount > 0 ? (colors.warning as any) : colors.text;

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
                style={[styles.englishText, { color: colors.englishText }]}
                skipDefaultColor
                numberOfLines={2}
              >
                {english || 'No translation available'}
              </ThemedText>
            </View>
          </View>

          {/* Arabic text on the right */}
          <ThemedText style={[styles.arabicText, { color: colors.arabicText }]} skipDefaultColor>
            {word_form}
          </ThemedText>
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
              <ThemedText style={[styles.statusText, { color: reviewInfo.color }]} skipDefaultColor>
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
                style={[styles.statusText, { color: masteryInfo.color }]}
                skipDefaultColor
              >
                {masteryInfo.label}
              </ThemedText>
            </View>
          )}

          {/* Right - Streak counter - Always show, even for 0 */}
          <View style={styles.statusItem}>
            <Ionicons name="flame" size={14} color={streakColor} style={styles.statusIcon} />
            <ThemedText
              style={[styles.statusText, streakCount > 0 ? { color: streakColor } : null]}
              skipDefaultColor={streakCount > 0}
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
  arabicText: {
    ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.HUGE, {
      textAlign: 'right',
      fontWeight: '600',
    }),
    flex: 0.5,
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    fontWeight: '500',
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
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
});

export default WordListItem;
