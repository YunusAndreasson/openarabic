import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { formatTimeAgo } from '../utils/dateUtils';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';

/**
 * TimeAgo component to show when an article was published or last opened
 */
export const TimeAgo = React.memo(({ date }: { date: string; isLastOpened?: boolean }) => {
  const colors = useColors();

  // Ensure we have a valid date
  const validDate = date ? date : new Date().toISOString();
  const timeAgoText = formatTimeAgo(validDate);

  return (
    <View style={styles.timeAgoContainer}>
      <Ionicons name="time-outline" size={14} color={colors.tint} style={styles.timeIcon} />
      <ThemedText type="caption" weight="500" colorName="tint" skipDefaultColor>
        {timeAgoText}
      </ThemedText>
    </View>
  );
});

/**
 * DifficultyIndicator component to display article difficulty
 */
export const DifficultyIndicator = React.memo(
  ({ level, hideLabel = false }: { level: number; hideLabel?: boolean }) => {
    const colors = useColors();

    // Normalize level to be between 1-5
    const normalizedLevel = Math.max(1, Math.min(5, level));

    // Get difficulty label based on level
    const difficultyLabel = useMemo(() => {
      switch (normalizedLevel) {
        case 1:
          return 'Beginner';
        case 2:
          return 'Elementary';
        case 3:
          return 'Intermediate';
        case 4:
          return 'Advanced';
        case 5:
          return 'Expert';
        default:
          return 'Intermediate';
      }
    }, [normalizedLevel]);

    return (
      <View style={styles.difficultyContainer}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <Ionicons
              key={star}
              name="star"
              size={12}
              color={star <= normalizedLevel ? colors.tint : colors.cardBorder}
              style={styles.starIcon}
            />
          ))}
        </View>
        {!hideLabel && (
          <View style={styles.difficultyTextContainer}>
            <ThemedText type="caption" variant="subtle" skipDefaultColor>
              {difficultyLabel}
            </ThemedText>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  // DifficultyIndicator styles
  difficultyContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  difficultyTextContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },

  // TimeAgo styles
  timeAgoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
  },
  timeIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
});
