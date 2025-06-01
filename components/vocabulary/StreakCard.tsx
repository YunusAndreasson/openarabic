import React, { memo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { CardHeader } from './shared/CardHeader';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  // Array of 7 days, with true/false indicating if the user was active on that day
  lastSevenDaysActivity: {
    date: string;
    active: boolean;
    dayName: string;
  }[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

export const StreakCard = memo(
  ({
    currentStreak = 0,
    longestStreak = 0,
    lastSevenDaysActivity = [],
    onInfoPress,
    hideTitle = false,
  }: StreakCardProps) => {
    const colors = useColors();

    // Day indicator size - smaller for less visual weight
    const pointRadius = 2;
    const pointStroke = 1.5;
    const dotRadius = pointRadius + pointStroke; // Total visible radius with stroke

    // Canvas dimensions with proper spacing to avoid cut-off dots
    const actualMargin = dotRadius + 2; // Add 2px extra buffer for safety
    const canvasWidth =
      Dimensions.get('window').width -
      LAYOUT.SCREEN_EDGE_PADDING * 2 -
      LAYOUT.CARD.PADDING.MEDIUM * 2;
    const timelineHeight = 24; // Reduced height for less prominence

    // Calculate usable width for dot placement
    const usableWidth = canvasWidth - 2 * actualMargin;

    // Use 7 days of activity data for cleaner visualization
    const extendedActivity = [...lastSevenDaysActivity];
    const defaultDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dayCount = 7;
    while (extendedActivity.length < dayCount) {
      extendedActivity.unshift({
        date: '',
        active: false,
        dayName: defaultDayNames[extendedActivity.length % 7] || 'Day',
      });
    }

    // If more than the desired days, keep only the most recent
    const normalizedActivity = extendedActivity.slice(-dayCount);

    // Calculate spacing to stretch across the usable width
    const dotSpacing = usableWidth / (dayCount - 1);

    // Colors
    const activeColor = colors.success;
    const inactiveColor = colors.warning;
    const lineBaseColor = colors.borderOverlay;

    // Calculate day positions for path creation with proper margin
    const dayPositions = normalizedActivity.map((day, index) => ({
      x: actualMargin + index * dotSpacing,
      y: timelineHeight / 2,
      active: day.active,
    }));

    // Generate subtitle based on streak
    const subtitle =
      currentStreak === 0
        ? 'Study today to start your streak'
        : currentStreak >= 7
          ? 'Amazing consistency! Keep it up'
          : 'Great progress! Keep going';

    return (
      <BaseCard style={styles.card} includePressAnimation={false} shadowSize="small">
        <View style={[styles.container, { padding: LAYOUT.CARD.PADDING.MEDIUM }]}>
          {!hideTitle && (
            <CardHeader title="Streak" subtitle={subtitle} onInfoPress={onInfoPress} />
          )}

          <View style={styles.content}>
            {/* Timeline visualization using React Native Views instead of Skia Canvas */}
            <View style={[styles.timelineContainer, { height: timelineHeight }]}>
              {/* Base line */}
              <View
                style={[
                  styles.baseLine,
                  {
                    backgroundColor: lineBaseColor,
                    top: timelineHeight / 2 - 0.5,
                    width: canvasWidth - 2 * actualMargin,
                    left: actualMargin,
                  },
                ]}
              />

              {/* Day indicators */}
              {dayPositions.map((day, index) => (
                <View
                  key={`day-${index}`}
                  style={[
                    styles.dayIndicator,
                    {
                      left: day.x - pointRadius - pointStroke,
                      top: day.y - pointRadius - pointStroke,
                      width: (pointRadius + pointStroke) * 2,
                      height: (pointRadius + pointStroke) * 2,
                      borderRadius: pointRadius + pointStroke,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dayIndicatorInner,
                      {
                        width: pointRadius * 2,
                        height: pointRadius * 2,
                        borderRadius: pointRadius,
                        backgroundColor: day.active ? activeColor : inactiveColor,
                        margin: pointStroke,
                      },
                    ]}
                  />
                </View>
              ))}

              {/* Connection lines between active days */}
              {dayPositions.map((day, index) => {
                if (
                  index < dayPositions.length - 1 &&
                  day.active &&
                  dayPositions[index + 1]?.active
                ) {
                  const nextDay = dayPositions[index + 1];
                  if (nextDay) {
                    const lineWidth = nextDay.x - day.x;
                    return (
                      <View
                        key={`connection-${index}`}
                        style={[
                          styles.connectionLine,
                          {
                            left: day.x,
                            top: day.y - 0.75,
                            width: lineWidth,
                            backgroundColor: activeColor,
                          },
                        ]}
                      />
                    );
                  }
                }
                return null;
              })}
            </View>

            {/* Streak information - both current and longest */}
            <View style={styles.streakInfo}>
              <View style={styles.streakDetail}>
                <ThemedText type="body" weight="bold" style={styles.streakValue}>
                  {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
                </ThemedText>
                <ThemedText type="caption" variant="secondary" style={styles.streakLabel}>
                  Longest streak
                </ThemedText>
              </View>
              <View style={styles.streakDetailRight}>
                <ThemedText type="body" weight="bold" style={styles.streakValue}>
                  {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                </ThemedText>
                <ThemedText type="caption" variant="secondary" style={styles.streakLabel}>
                  Current streak
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

StreakCard.displayName = 'StreakCard';

const styles = StyleSheet.create({
  card: {
    padding: 0,
    width: '100%',
  },
  container: {
    width: '100%',
  },
  content: {
    width: '100%',
  },
  timelineContainer: {
    position: 'relative',
    width: '100%',
  },
  baseLine: {
    position: 'absolute',
    height: 1,
  },
  dayIndicator: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  dayIndicatorInner: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  connectionLine: {
    position: 'absolute',
    height: 1,
  },
  streakInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.SMALL, // Reduced spacing for tighter grouping
  },
  streakDetail: {
    alignItems: 'flex-start',
  },
  streakDetailRight: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    // Using caption type, no custom font size needed
    marginTop: LAYOUT.SPACING.TINY,
  },
  streakValue: {
    // Using body type, no custom line height needed
  },
});
