import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

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
          style={[
            styles.progressValue,
            stat.color && { color: stat.color },
            { letterSpacing: -0.2 },
          ]}
        >
          {stat.value}
        </ThemedText>
        {stat.showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.secondaryText}
            style={[styles.chevronIcon, { opacity: 0.8 }]}
          />
        )}
      </View>
      <ThemedText
        type="caption"
        variant="secondary"
        style={[styles.progressLabel, { opacity: 0.85 }]}
      >
        {stat.label}
      </ThemedText>
    </View>
  );

  if (stat.onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.tappableStat,
          {
            backgroundColor: colors.buttonOverlay + '08',
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          },
        ]}
        activeOpacity={0.65}
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
      <View style={styles.statsSeparator} />
      <StatItem stat={rightStat} />
    </View>
  );
});

StatsRow.displayName = 'StatsRow';

const styles = StyleSheet.create({
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.SMALL,
    marginTop: 1,
  },
  progressLabel: {
    includeFontPadding: false,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    marginTop: 1,
  },
  progressStat: {
    alignItems: 'flex-start',
    flex: 1,
    minHeight: 48,
  },
  progressStatsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XSMALL,
  },
  progressValue: {
    includeFontPadding: false,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    marginBottom: 2,
  },
  statValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.XSMALL,
    minHeight: 24,
  },
  statsSeparator: {
    backgroundColor: 'transparent',
    height: 32,
    marginHorizontal: LAYOUT.SPACING.LARGE,
    width: 1,
  },
  tappableStat: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    margin: -LAYOUT.SPACING.SMALL,
    minHeight: 44,
    padding: LAYOUT.SPACING.SMALL,
  },
});
