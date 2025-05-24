import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useStreakData } from '@/hooks/useStreakData';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../../BaseCard';
import { ThemedText } from '../../ThemedText';
import { CardHeader } from '../shared/CardHeader';
import { StatsRow } from '../shared/StatsRow';

interface StreakInsightsProps {
  onInfoPress: () => void;
}

export const StreakInsights = memo(({ onInfoPress }: StreakInsightsProps) => {
  const colors = useColors();
  const { user } = useAuth();
  const streakData = useStreakData(user?.id);

  // Calculate streak status for visual feedback
  const streakStatus = useMemo(() => {
    const { currentStreak } = streakData;

    if (currentStreak === 0) {
      return { color: colors.textTertiary };
    }
    if (currentStreak >= 7) {
      return { color: colors.success };
    }
    if (currentStreak >= 3) {
      return { color: colors.warning };
    }
    return { color: colors.info };
  }, [streakData, colors]);

  // Generate subtitle based on streak
  const subtitle = useMemo(() => {
    const { currentStreak } = streakData;
    if (currentStreak === 0) {
      return 'Start today to begin building consistency';
    }
    if (currentStreak >= 7) {
      return 'Excellent daily consistency!';
    }
    return 'Building momentum';
  }, [streakData.currentStreak]);

  // Activity dots for last 7 days
  const activityDots = useMemo(() => {
    return streakData.lastSevenDaysActivity.map((day, index) => {
      const isActive = day.active;
      const isToday = index === streakData.lastSevenDaysActivity.length - 1;

      return (
        <View key={`activity-${index}`} style={styles.activityDot}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? colors.success : withOpacity(colors.textTertiary, 0.2),
                borderWidth: isToday ? 2 : 0,
                borderColor: isToday ? colors.tint : 'transparent',
              },
            ]}
          />
          <ThemedText type="caption" variant="subtle" style={styles.dayLabel}>
            {day.dayName}
          </ThemedText>
        </View>
      );
    });
  }, [streakData.lastSevenDaysActivity, colors]);

  return (
    <BaseCard style={styles.streakCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.streakContent}>
        <CardHeader title="Streak" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: streakData.currentStreak,
            label: 'current',
            color: streakStatus.color,
          }}
          rightStat={{
            value: streakData.longestStreak,
            label: 'best',
          }}
        />

        {/* Activity visualization */}
        <View
          style={[
            styles.activitySection,
            { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
          ]}
        >
          <View style={styles.activityRow}>{activityDots}</View>
        </View>
      </View>
    </BaseCard>
  );
});

StreakInsights.displayName = 'StreakInsights';

const styles = StyleSheet.create({
  streakCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  streakContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  activitySection: {
    paddingTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  activityDot: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  dayLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textAlign: 'center',
  },
});
