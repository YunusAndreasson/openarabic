import { Canvas } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { memo } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

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

    return (
      <TouchableWithoutFeedback onPress={hideTooltip}>
        <View style={[styles.container, { width: resolvedWidth, height }]}>
          {/* Main Chart Canvas */}
          <Canvas style={{ width: resolvedWidth, height }}>{children}</Canvas>

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
});

export type { DataPoint } from '@/types/ui/chart.types';
