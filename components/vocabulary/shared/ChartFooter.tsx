import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import { ThemedText } from '../../ThemedText';

interface LegendItemProps {
  type: 'bar' | 'line' | 'area' | 'dot';
  color: string;
  label: string;
}

interface ChartFooterProps {
  legendItems: LegendItemProps[];
  timeRange: string;
}

export const ChartFooter = memo(({ legendItems, timeRange }: ChartFooterProps) => {
  const colors = useColors();

  const renderLegendIndicator = (item: LegendItemProps) => {
    switch (item.type) {
      case 'bar':
        return <View style={[styles.legendBar, { backgroundColor: item.color }]} />;
      case 'line':
        return <View style={[styles.legendLine, { backgroundColor: item.color }]} />;
      case 'area':
        return <View style={[styles.legendArea, { backgroundColor: item.color }]} />;
      case 'dot':
        return <View style={[styles.legendDot, { backgroundColor: item.color }]} />;
      default:
        return <View style={[styles.legendBar, { backgroundColor: item.color }]} />;
    }
  };

  return (
    <View style={[styles.progressFooter, { borderTopColor: colors.borderOverlay }]}>
      <View style={styles.progressLegend}>
        {legendItems.map((item, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            {renderLegendIndicator(item)}
            <ThemedText
              type="caption"
              variant="secondary"
              style={styles.legendText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.timeRange}>
        <ThemedText
          type="caption"
          variant="disabled"
          style={styles.timeRangeText}
          numberOfLines={1}
        >
          {timeRange}
        </ThemedText>
      </View>
    </View>
  );
});

ChartFooter.displayName = 'ChartFooter';

const styles = StyleSheet.create({
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.SMALL,
    minHeight: 40,
  },
  progressLegend: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '45%',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  legendBar: {
    width: 12,
    height: 6,
    borderRadius: 6 / 2,
    marginRight: LAYOUT.SPACING.XSMALL,
    flexShrink: 0,
  },
  legendLine: {
    width: 12,
    height: 2,
    borderRadius: 2 / 2,
    marginRight: LAYOUT.SPACING.XSMALL,
    flexShrink: 0,
  },
  legendArea: {
    width: 12,
    height: 6,
    borderRadius: 6 / 2,
    marginRight: LAYOUT.SPACING.XSMALL,
    flexShrink: 0,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 6 / 2,
    marginRight: LAYOUT.SPACING.XSMALL,
    flexShrink: 0,
  },
  legendText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    flexWrap: 'wrap',
  },
  timeRange: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 70,
    paddingTop: 2,
  },
  timeRangeText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'right',
  },
});
