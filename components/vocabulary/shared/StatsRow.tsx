import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { selectionFeedback } from '@/utils/haptics';

import { ThemedText } from '../../ThemedText';

interface StatItemProps {
  value: number | string;
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
      selectionFeedback();
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
            color={colors.secondaryText}
            name="chevron-forward"
            size={16}
            style={[styles.chevronIcon, { opacity: 0.8 }]}
          />
        )}
      </View>
      <ThemedText
        style={[styles.progressLabel, { opacity: 0.85 }]}
        type="caption"
        variant="secondary"
      >
        {stat.label}
      </ThemedText>
    </View>
  );

  if (stat.onPress) {
    return (
      <TouchableOpacity
        accessibilityHint="Tap to view related words"
        accessibilityLabel={`${stat.value} ${stat.label}`}
        accessibilityRole="button"
        activeOpacity={0.65}
        style={[
          styles.tappableStat,
          {
            backgroundColor: colors.buttonOverlay + '08',
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          },
        ]}
        onPress={handlePress}
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
    backgroundColor: Colors.light.transparent,
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
