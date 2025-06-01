import React, { memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { lightFeedback } from '@/utils/haptics';

import { ThemedText } from '../../ThemedText';

interface StatItemProps {
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
}

interface StatsRowProps {
  leftStat: StatItemProps;
  rightStat: StatItemProps;
}

// Memoized StatItem component to prevent unnecessary re-renders
const StatItem = memo(({ stat }: { stat: StatItemProps }) => {
  const handlePress = useCallback(() => {
    if (stat.onPress) {
      lightFeedback();
      stat.onPress();
    }
  }, [stat.onPress]);

  const content = (
    <View style={styles.progressStat}>
      <ThemedText
        type="heading2"
        weight="bold"
        style={[styles.progressValue, stat.color && { color: stat.color }]}
      >
        {stat.value}
      </ThemedText>
      <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
        {stat.label}
      </ThemedText>
    </View>
  );

  if (stat.onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.tappableStat}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${stat.value} ${stat.label}`}
        accessibilityHint="Tap to view related words"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

StatItem.displayName = 'StatItem';

export const StatsRow = memo(({ leftStat, rightStat }: StatsRowProps) => {
  return (
    <View style={styles.progressStatsRow}>
      <StatItem stat={leftStat} />
      <StatItem stat={rightStat} />
    </View>
  );
});

StatsRow.displayName = 'StatsRow';

const styles = StyleSheet.create({
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  progressStat: {
    alignItems: 'flex-start',
  },
  tappableStat: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    padding: LAYOUT.SPACING.XSMALL,
    margin: -LAYOUT.SPACING.XSMALL, // Negative margin to maintain visual spacing
  },
  progressValue: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  progressLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
