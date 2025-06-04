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

    // Enhanced day indicator size for better visibility
    const pointRadius = 3; // Increased from 2 for better visual impact
    const pointStroke = 2; // Increased from 1.5 for better definition
    const dotRadius = pointRadius + pointStroke;

    // Enhanced canvas dimensions with better spacing
    const actualMargin = dotRadius + 4; // Increased buffer for better spacing
    const canvasWidth =
      Dimensions.get('window').width -
      LAYOUT.SCREEN_EDGE_PADDING * 2 -
      LAYOUT.CARD.PADDING.MEDIUM * 2;
    const timelineHeight = 32; // Increased from 24 for better breathing room

    // Calculate usable width for dot placement
    const usableWidth = canvasWidth - 2 * actualMargin;

    // Use 7 days of activity data for visualization
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

    // Enhanced colors with better contrast
    const activeColor = colors.success;
    const inactiveColor = colors.buttonOverlay; // Softer color for inactive days
    const lineBaseColor = colors.borderOverlay;
    const connectionColor = colors.success; // Use success color for connections

    // Calculate day positions with proper margin
    const dayPositions = normalizedActivity.map((day, index) => ({
      x: actualMargin + index * dotSpacing,
      y: timelineHeight / 2,
      active: day.active,
      dayName: day.dayName,
    }));

    // Enhanced subtitle with more encouragement
    const subtitle =
      currentStreak === 0
        ? 'Study today to start your streak'
        : currentStreak >= 7
          ? 'Amazing consistency! Keep it up'
          : currentStreak >= 3
            ? 'Great momentum! Keep going'
            : 'Building consistency daily';

    return (
      <BaseCard style={styles.card} includePressAnimation={false} shadowSize="small">
        <View style={[styles.container, { padding: LAYOUT.CARD.PADDING.LARGE }]}>
          {!hideTitle && (
            <View style={styles.headerSection}>
              <CardHeader title="Streak" subtitle={subtitle} onInfoPress={onInfoPress} />
            </View>
          )}

          <View style={styles.content}>
            {/* Enhanced Timeline visualization */}
            <View style={[styles.timelineContainer, { height: timelineHeight }]}>
              {/* Base line with improved styling */}
              <View
                style={[
                  styles.baseLine,
                  {
                    backgroundColor: lineBaseColor,
                    top: timelineHeight / 2 - 0.5,
                    width: canvasWidth - 2 * actualMargin,
                    left: actualMargin,
                    opacity: 0.6, // Subtle base line
                  },
                ]}
              />

              {/* Enhanced day indicators */}
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
                      // Enhanced shadow for better depth
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: day.active ? 0.15 : 0.05,
                      shadowRadius: 2,
                      elevation: day.active ? 2 : 1,
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
                        // Enhanced visual feedback for active days
                        opacity: day.active ? 1 : 0.4,
                      },
                    ]}
                  />
                </View>
              ))}

              {/* Enhanced connection lines between active days */}
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
                            top: day.y - 1, // Better centered line
                            width: lineWidth,
                            backgroundColor: connectionColor,
                            height: 2, // Thicker connection line
                            opacity: 0.8,
                          },
                        ]}
                      />
                    );
                  }
                }
                return null;
              })}
            </View>

            {/* Day labels for better context */}
            <View style={styles.dayLabels}>
              {dayPositions.map((day, index) => (
                <View
                  key={`label-${index}`}
                  style={[
                    styles.dayLabel,
                    {
                      left: day.x - 12, // Center the label under the dot
                      width: 24,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    style={[
                      styles.dayLabelText,
                      {
                        color: day.active ? colors.text : colors.secondaryText,
                        opacity: day.active ? 0.8 : 0.5,
                        fontWeight: day.active ? '600' : '400',
                      },
                    ]}
                  >
                    {day.dayName.slice(0, 1)} {/* Show just first letter */}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Enhanced streak information with better visual hierarchy */}
            <View style={styles.streakInfo}>
              <View style={styles.streakDetail}>
                <ThemedText
                  type="heading2"
                  weight="bold"
                  style={[
                    styles.streakValue,
                    {
                      color: longestStreak > 0 ? colors.success : colors.secondaryText,
                      letterSpacing: -0.2,
                    },
                  ]}
                >
                  {longestStreak}
                </ThemedText>
                <ThemedText
                  type="caption"
                  variant="secondary"
                  style={[styles.streakLabel, { opacity: 0.8 }]}
                >
                  Best streak
                </ThemedText>
              </View>

              <View style={styles.streakDetailRight}>
                <ThemedText
                  type="heading2"
                  weight="bold"
                  style={[
                    styles.streakValue,
                    {
                      color: currentStreak > 0 ? colors.tint : colors.secondaryText,
                      letterSpacing: -0.2,
                    },
                  ]}
                >
                  {currentStreak}
                </ThemedText>
                <ThemedText
                  type="caption"
                  variant="secondary"
                  style={[styles.streakLabel, { opacity: 0.8 }]}
                >
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
  headerSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM, // Better spacing after header
  },
  timelineContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: LAYOUT.SPACING.SMALL, // Space before day labels
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
  },
  dayLabels: {
    position: 'relative',
    height: 20, // Fixed height for day labels
    marginBottom: LAYOUT.SPACING.LARGE, // Better spacing before streak info
  },
  dayLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    includeFontPadding: false,
  },
  streakInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM, // Better visual separation
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)', // Subtle divider
  },
  streakDetail: {
    alignItems: 'flex-start',
    flex: 1,
  },
  streakDetailRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  streakLabel: {
    marginTop: LAYOUT.SPACING.TINY,
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
  streakValue: {
    fontSize: 24,
    lineHeight: 28,
    includeFontPadding: false,
  },
});
