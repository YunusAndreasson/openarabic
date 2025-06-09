import { Canvas } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChartTooltipData, DataPointOverlay, useChartTooltip } from './ChartInteractivity';
import { useGraphWidth, GRAPH_HEIGHT_LARGE } from './constants';
import type { DataPoint } from '@/types/ui/chart.types';

interface ChartCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;

  // Interactive features
  dataPoints?: DataPoint[];
  enableTooltips?: boolean;
}

/**
 * Standardized chart canvas that provides consistent interactive features
 * across all vocabulary charts including tooltips and data point overlays.
 */
export const ChartCanvas = memo(
  ({
    children,
    width,
    height = GRAPH_HEIGHT_LARGE,
    dataPoints = [],
    enableTooltips = true,
  }: ChartCanvasProps) => {
    const graphWidth = useGraphWidth();
    const resolvedWidth = width ?? graphWidth;
    const { tooltip, showTooltip } = useChartTooltip();

    return (
      <View style={[styles.container, { width: resolvedWidth, height }]}>
        {/* Main Chart Canvas */}
        <Canvas style={{ width: resolvedWidth, height }}>{children}</Canvas>

        {/* Interactive Data Point Overlays */}
        {enableTooltips &&
          dataPoints.map(point => (
            <DataPointOverlay
              key={`data-point-${point.label}-${point.value}`}
              label={point.label}
              value={point.value}
              x={point.x}
              y={point.y}
              onPress={showTooltip}
            />
          ))}

        {/* Tooltip Component */}
        {enableTooltips && <ChartTooltipData maxWidth={width || resolvedWidth} tooltip={tooltip} />}
      </View>
    );
  }
);

ChartCanvas.displayName = 'ChartCanvas';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});

export type { DataPoint } from '@/types/ui/chart.types';
