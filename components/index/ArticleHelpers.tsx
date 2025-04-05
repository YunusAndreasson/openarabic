import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { useIsDarkMode } from '../../hooks/useThemeDetection';
import { formatTimeAgo } from '../../utils/dateUtils';
import { ThemedText } from '../ThemedText';

/**
 * TimeAgo component to show when an article was published or last opened
 */
export const TimeAgo = memo(({ date }: { date: string }) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Ensure we have a valid date
  const validDate = date ? date : new Date().toISOString();
  const timeAgoText = formatTimeAgo(validDate);

  return (
    <View style={styles.timeAgoContainer}>
      <Ionicons
        name="time-outline"
        size={14}
        color={isDarkMode ? colors.white : colors.tint}
        style={styles.timeIcon}
      />
      <ThemedText
        type="caption"
        weight="500"
        colorName={isDarkMode ? 'text' : 'tint'}
        skipDefaultColor
      >
        {timeAgoText}
      </ThemedText>
    </View>
  );
});

TimeAgo.displayName = 'TimeAgo';

/**
 * DifficultyIndicator component to display article difficulty
 */
export const DifficultyIndicator = memo(
  ({ level, hideLabel = false }: { level: number; hideLabel?: boolean }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

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
              color={
                star <= normalizedLevel
                  ? colors.tint
                  : isDarkMode
                    ? colors.white + '40'
                    : colors.cardBorder
              }
              style={styles.starIcon}
            />
          ))}
        </View>
        {!hideLabel ? (
          <View style={styles.difficultyTextContainer}>
            <ThemedText
              type="caption"
              colorName={isDarkMode ? 'text' : undefined}
              variant={isDarkMode ? undefined : 'subtle'}
              skipDefaultColor={!isDarkMode}
            >
              {difficultyLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }
);

DifficultyIndicator.displayName = 'DifficultyIndicator';

/**
 * SummaryIndicator component to display article summary in compact views
 */
export const SummaryIndicator = memo(({ summary }: { summary: string | null }) => {
  const isDarkMode = useIsDarkMode();

  if (!summary) return null;

  return (
    <View style={styles.summaryIndicatorContainer}>
      <ThemedText
        type="caption"
        colorName={isDarkMode ? 'text' : undefined}
        variant={isDarkMode ? undefined : 'subtle'}
        style={styles.summaryText}
      >
        {summary}
      </ThemedText>
    </View>
  );
});

SummaryIndicator.displayName = 'SummaryIndicator';

const styles = StyleSheet.create({
  // DifficultyIndicator styles
  difficultyContainer: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  difficultyTextContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  starIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  starsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  summaryIndicatorContainer: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    marginTop: LAYOUT.SPACING.TINY,
  },
  summaryText: {
    lineHeight: 14,
  },
  timeAgoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: 0,
  },
  timeIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
});
