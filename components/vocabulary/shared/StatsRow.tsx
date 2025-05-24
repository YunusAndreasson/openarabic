import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { ThemedText } from '../../ThemedText';

interface StatItemProps {
  value: string | number;
  label: string;
  color?: string;
}

interface StatsRowProps {
  leftStat: StatItemProps;
  rightStat: StatItemProps;
}

export const StatsRow = memo(({ leftStat, rightStat }: StatsRowProps) => {
  return (
    <View style={styles.progressStatsRow}>
      <View style={styles.progressStat}>
        <ThemedText
          type="heading2"
          weight="bold"
          style={[styles.progressValue, leftStat.color && { color: leftStat.color }]}
        >
          {leftStat.value}
        </ThemedText>
        <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
          {leftStat.label}
        </ThemedText>
      </View>
      <View style={styles.progressStat}>
        <ThemedText
          type="heading3"
          weight="bold"
          style={[styles.progressValue, rightStat.color && { color: rightStat.color }]}
        >
          {rightStat.value}
        </ThemedText>
        <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
          {rightStat.label}
        </ThemedText>
      </View>
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
  progressValue: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  progressLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
