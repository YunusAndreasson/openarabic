import { Canvas } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import type { DataPoint } from '@/types/ui/chart.types';

import { ChartTooltipData, DataPointOverlay, useChartTooltip } from './ChartInteractivity';
import { GRAPH_HEIGHT_LARGE, useGraphWidth } from './constants';

interface ChartCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;
  dataPoints?: DataPoint[];
}

/**
 * Standardized chart canvas that provides consistent interactive features
 * across all vocabulary charts including tooltips and data point overlays.
 */
export const ChartCanvas = memo(
  ({ children, width, height = GRAPH_HEIGHT_LARGE, dataPoints = [] }: ChartCanvasProps) => {
    const graphWidth = useGraphWidth();
    const resolvedWidth = width ?? graphWidth;
    const { tooltip, showTooltip, hideTooltip } = useChartTooltip();
    const colors = useColors();

    const canvasStyle = useMemo(() => ({ width: resolvedWidth, height }), [resolvedWidth, height]);

    // Inline last-value badge removed; bottom summary shows Latest/Average/Max

    const activeCursor = useMemo(() => {
      if (!tooltip.visible) return null;
      const x = Math.max(0, Math.min(tooltip.x, resolvedWidth));
      return (
        <View
          pointerEvents="none"
          style={[
            styles.cursor,
            {
              left: x,
              height,
              backgroundColor: colors.tint,
              opacity: 0.15,
            },
          ]}
        />
      );
    }, [tooltip.visible, tooltip.x, resolvedWidth, height, colors.tint]);

    return (
      <TouchableWithoutFeedback onPress={hideTooltip}>
        <View style={[styles.container, { width: resolvedWidth, height }]}>
          {/* Main Chart Canvas */}
          <Canvas style={canvasStyle}>{children}</Canvas>

          {/* Interactive Data Point Overlays */}
          {dataPoints.map(point => (
            <DataPointOverlay
              key={`data-point-${point.label}-${point.value}`}
              label={point.label}
              value={point.value}
              x={point.x}
              y={point.y}
              onPress={showTooltip}
            />
          ))}

          {/* Active cursor when tooltip is shown */}
          {activeCursor}

          {/* Tooltip Component */}
          <ChartTooltipData maxWidth={width || resolvedWidth} tooltip={tooltip} />
        </View>
      </TouchableWithoutFeedback>
    );
  }
);

ChartCanvas.displayName = 'ChartCanvas';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontWeight: '600',
  },
  cursor: {
    position: 'absolute',
    width: 2,
    top: 0,
  },
});

export type { DataPoint } from '@/types/ui/chart.types';
