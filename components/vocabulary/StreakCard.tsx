import { Canvas, Circle, Group, Line, Path } from '@shopify/react-native-skia';
import React, { memo, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useProgressAnimation } from '@/hooks/animations';
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
}

export const StreakCard = memo(
  ({
    currentStreak = 0,
    longestStreak = 0,
    lastSevenDaysActivity = [],
    onInfoPress,
  }: StreakCardProps) => {
    const colors = useColors();

    // Animation value for line drawing
    const { progress } = useProgressAnimation(0, 1200);

    // Start animation when component mounts
    useEffect(() => {
      // Initialize the animation (0 to 100 percent)
      progress.value = 0;
      const updateFn = () => {
        progress.value = 1;
      };
      // Small delay for better visual appeal
      const timer = setTimeout(updateFn, 100);
      return () => clearTimeout(timer);
    }, [progress]);

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

    // Create paths for connecting lines to animate them properly
    const connectionPaths = dayPositions
      .map((day, index) => {
        if (index < dayPositions.length - 1 && day.active && dayPositions[index + 1]?.active) {
          const nextDay = dayPositions[index + 1];
          if (nextDay) {
            return `M ${day.x} ${day.y} L ${nextDay.x} ${nextDay.y}`;
          }
        }
        return '';
      })
      .filter(path => path !== '');

    // Generate subtitle based on streak
    const subtitle =
      currentStreak === 0
        ? 'Start today to begin building consistency'
        : currentStreak >= 7
          ? 'Excellent daily consistency!'
          : 'Building momentum';

    return (
      <BaseCard style={styles.card} includePressAnimation={false} shadowSize="small">
        <View style={[styles.container, { padding: LAYOUT.CARD.PADDING.MEDIUM }]}>
          <CardHeader title="Learning Streak" subtitle={subtitle} onInfoPress={onInfoPress} />

          <View style={styles.content}>
            {/* Timeline visualization */}
            <Canvas style={styles.timelineCanvas}>
              <Group>
                {/* Base line connecting all dots */}
                <Line
                  p1={{ x: actualMargin, y: timelineHeight / 2 }}
                  p2={{ x: canvasWidth - actualMargin, y: timelineHeight / 2 }}
                  color={lineBaseColor}
                  strokeWidth={1}
                />

                {/* Green connecting lines between active days with animation */}
                {connectionPaths.map((pathData, index) => (
                  <Path
                    key={`connection-path-${index}`}
                    path={pathData}
                    color={activeColor}
                    style="stroke"
                    strokeWidth={1.5}
                    start={0}
                    end={progress}
                  />
                ))}

                {/* Day indicators (dots) - with white outline for consistency with graph */}
                {dayPositions.map((day, index) => (
                  <Group
                    key={`day-${index}`}
                    transform={[{ translateX: day.x }, { translateY: day.y }]}
                  >
                    {/* Background circle (serves as white stroke) */}
                    <Circle cx={0} cy={0} r={pointRadius + pointStroke} color={colors.card} />
                    {/* Colored circle */}
                    <Circle
                      cx={0}
                      cy={0}
                      r={pointRadius}
                      color={day.active ? activeColor : inactiveColor}
                    />
                  </Group>
                ))}
              </Group>
            </Canvas>

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
    marginBottom: LAYOUT.SPACING.LARGE, // More space for better section separation
    padding: 0,
    width: '100%',
  },
  container: {
    width: '100%',
  },
  content: {
    width: '100%',
  },
  timelineCanvas: {
    height: 24, // Match reduced timeline height
    width: '100%',
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
