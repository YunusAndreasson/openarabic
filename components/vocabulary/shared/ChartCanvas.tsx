import React, { memo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';

import { ChartTooltip, DataPointOverlay, useChartTooltip } from './ChartInteractivity';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE } from './constants';

export interface DataPoint {
  x: number;
  y: number;
  value: string;
  label: string;
  data?: any; // Additional data for the point
}

interface ChartCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;

  // Interactive features
  dataPoints?: DataPoint[];
  enableTooltips?: boolean;

  // Accessibility
  accessibilityLabel?: string;
}

/**
 * Standardized chart canvas that provides consistent interactive features
 * across all vocabulary charts including tooltips and data point overlays.
 */
export const ChartCanvas = memo(
  ({
    children,
    width = GRAPH_WIDTH,
    height = GRAPH_HEIGHT_LARGE,
    dataPoints = [],
    enableTooltips = true,
    accessibilityLabel = 'Chart visualization',
  }: ChartCanvasProps) => {
    const { tooltip, showTooltip } = useChartTooltip();

    return (
      <View
        style={[styles.container, { width, height }]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        {/* Main Chart Canvas */}
        <Canvas style={{ width, height }}>{children}</Canvas>

        {/* Interactive Data Point Overlays */}
        {enableTooltips &&
          dataPoints.map((point, index) => (
            <DataPointOverlay
              key={`data-point-${index}`}
              x={point.x}
              y={point.y}
              value={point.value}
              label={point.label}
              onPress={showTooltip}
              accessibilityLabel={`Data point: ${point.value} ${point.label}`}
            />
          ))}

        {/* Tooltip Component */}
        {enableTooltips && <ChartTooltip tooltip={tooltip} maxWidth={width} />}
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
