import React, { memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '@/constants/layout';
import { lightFeedback } from '@/utils/haptics';
import { useColors } from '@/hooks/useColors';

import { ThemedText } from '../../ThemedText';

interface StatItemProps {
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

interface StatsRowProps {
  leftStat: StatItemProps;
  rightStat: StatItemProps;
}

// Memoized StatItem component to prevent unnecessary re-renders
const StatItem = memo(({ stat }: { stat: StatItemProps }) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    if (stat.onPress) {
      lightFeedback();
      stat.onPress();
    }
  }, [stat.onPress]);

  const content = (
    <View style={styles.progressStat}>
      <View style={styles.statValueRow}>
        <ThemedText
          type="heading2"
          weight="bold"
          style={[styles.progressValue, stat.color && { color: stat.color }]}
        >
          {stat.value}
        </ThemedText>
        {stat.showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.secondaryText}
            style={styles.chevronIcon}
          />
        )}
      </View>
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
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XSMALL,
  },
  tappableStat: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    padding: LAYOUT.SPACING.XSMALL,
    margin: -LAYOUT.SPACING.XSMALL,
  },
  progressValue: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.XSMALL,
    marginTop: 2,
  },
  progressLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
