import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

import { ThemedText } from '../../ThemedText';

interface LegendItemProps {
  type: 'area' | 'bar' | 'dot' | 'line';
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
        {legendItems.map(item => (
          <View key={`legend-${item.type}-${item.label}`} style={styles.legendItem}>
            {renderLegendIndicator(item)}
            <ThemedText
              ellipsizeMode="tail"
              numberOfLines={2}
              style={styles.legendText}
              type="caption"
              variant="secondary"
            >
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.timeRange}>
        <ThemedText
          numberOfLines={1}
          style={styles.timeRangeText}
          type="caption"
          variant="disabled"
        >
          {timeRange}
        </ThemedText>
      </View>
    </View>
  );
});

ChartFooter.displayName = 'ChartFooter';

const styles = StyleSheet.create({
  legendArea: {
    borderRadius: 6 / 2,
    flexShrink: 0,
    height: 6,
    marginRight: LAYOUT.SPACING.SMALL,
    width: 12,
  },
  legendBar: {
    borderRadius: 6 / 2,
    flexShrink: 0,
    height: 6,
    marginRight: LAYOUT.SPACING.SMALL,
    width: 12,
  },
  legendDot: {
    borderRadius: 6 / 2,
    flexShrink: 0,
    height: 6,
    marginRight: LAYOUT.SPACING.SMALL,
    width: 6,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    marginBottom: LAYOUT.SPACING.TINY,
    maxWidth: '45%',
  },
  legendLine: {
    borderRadius: 2 / 2,
    flexShrink: 0,
    height: 2,
    marginRight: LAYOUT.SPACING.SMALL,
    width: 12,
  },
  legendText: {
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  progressFooter: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.SMALL,
    minHeight: 40,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  progressLegend: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  timeRange: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 70,
    paddingTop: 2,
  },
  timeRangeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    textAlign: 'right',
  },
});
