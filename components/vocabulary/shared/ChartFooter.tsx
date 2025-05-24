import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

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
    <View
      style={[styles.progressFooter, { borderTopColor: withOpacity(colors.textTertiary, 0.1) }]}
    >
      <View style={styles.progressLegend}>
        {legendItems.map((item, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            {renderLegendIndicator(item)}
            <ThemedText type="caption" variant="secondary" style={styles.legendText}>
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.timeRange}>
        <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  progressLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,
  },
  legendBar: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendArea: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  timeRange: {
    alignItems: 'center',
  },
  timeRangeText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
