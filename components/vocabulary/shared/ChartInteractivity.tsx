/**
 * Reusable Chart Interactivity Components
 *
 * This file provides DRY components for adding interactive tooltips to any chart.
 *
 * Usage Example:
 * ```typescript
 * import { ChartTooltip, DataPointOverlay, useChartTooltip } from '../shared/ChartInteractivity';
 *
 * // In your chart component:
 * const { tooltip, showTooltip } = useChartTooltip();
 *
 * // Add overlays for each data point:
 * {dataPoints.map((point, index) => (
 *   <DataPointOverlay
 *     key={`data-point-${index}`}
 *     x={point.x}
 *     y={point.y}
 *     value="85.2%"
 *     label="Jan 15"
 *     onPress={showTooltip}
 *   />
 * ))}
 *
 * // Add the tooltip:
 * <ChartTooltip tooltip={tooltip} maxWidth={GRAPH_WIDTH} />
 * ```
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

interface ChartTooltip {
  x: number;
  y: number;
  value: string;
  label: string;
  visible: boolean;
}

interface ChartTooltipProps {
  tooltip: ChartTooltip;
  maxWidth: number;
}

export const ChartTooltip = memo<ChartTooltipProps>(({ tooltip, maxWidth }) => {
  const colors = useColors();

  if (!tooltip.visible) return null;

  return (
    <Animated.View
      style={[
        styles.tooltip,
        {
          left: Math.max(8, Math.min(tooltip.x - 40, maxWidth - 88)),
          top: Math.max(8, tooltip.y),
          backgroundColor: colors.background,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      entering={FadeInUp.duration(200)}
      exiting={FadeOutDown.duration(150)}
    >
      <ThemedText style={[styles.tooltipValue, { color: colors.text }]}>{tooltip.value}</ThemedText>
      <ThemedText style={[styles.tooltipLabel, { color: colors.secondaryText }]}>
        {tooltip.label}
      </ThemedText>
    </Animated.View>
  );
});

ChartTooltip.displayName = 'ChartTooltip';

interface DataPointOverlayProps {
  x: number;
  y: number;
  value: string;
  label: string;
  onPress: (x: number, y: number, value: string, label: string) => void;
  accessibilityLabel?: string;
}

export const DataPointOverlay = memo<DataPointOverlayProps>(
  ({ x, y, value, label, onPress, accessibilityLabel }) => {
    const handlePress = useCallback(() => {
      onPress(x, y, value, label);
    }, [x, y, value, label, onPress]);

    return (
      <TouchableOpacity
        style={{
          position: 'absolute',
          left: x - 12,
          top: y - 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'transparent',
        }}
        onPress={handlePress}
        accessibilityLabel={accessibilityLabel || `Data point: ${value} ${label}`}
        accessibilityRole="button"
      />
    );
  }
);

DataPointOverlay.displayName = 'DataPointOverlay';

export const useChartTooltip = (autoHideDelay: number = 3000) => {
  const [tooltip, setTooltip] = useState<ChartTooltip>({
    x: 0,
    y: 0,
    value: '',
    label: '',
    visible: false,
  });

  useEffect(() => {
    if (tooltip.visible) {
      const timer = setTimeout(() => {
        setTooltip(prev => ({ ...prev, visible: false }));
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [tooltip.visible, autoHideDelay]);

  const showTooltip = useCallback(
    (x: number, y: number, value: string, label: string, yOffset: number = -40) => {
      lightFeedback();
      setTooltip({
        x,
        y: y + yOffset,
        value,
        label,
        visible: true,
      });
    },
    []
  );

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    tooltip,
    showTooltip,
    hideTooltip,
  };
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tooltipLabel: {
    fontSize: 14,
  },
});
