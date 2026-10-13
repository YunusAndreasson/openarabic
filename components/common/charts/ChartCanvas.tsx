import { Canvas, Group } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { CHART_OPACITY } from '@/constants/chartColors';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, STATUS_INDICATOR } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { DataPoint } from '@/types/ui/chart.types';

import { CHART_VISUAL, GRAPH_HEIGHT_LARGE, useGraphWidth } from '@/constants/chartConstants';

import { ChartTooltipData, DataPointOverlay, useChartTooltip } from './ChartInteractivity';

interface ChartCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;
  dataPoints?: DataPoint[];
}

/**
 * Standardized chart canvas that provides consistent interactive features
 * across all vocabulary charts including tooltips and data point overlays.
 * Height includes bottom padding to prevent data point clipping.
 */
export function ChartCanvas({
  children,
  width,
  height = GRAPH_HEIGHT_LARGE + CHART_VISUAL.CHART_BOTTOM_PADDING,
  dataPoints = [],
}: ChartCanvasProps) {
  const graphWidth = useGraphWidth();
  const resolvedWidth = width ?? graphWidth;
  const { tooltip, showTooltip, hideTooltip } = useChartTooltip();
  const colors = useColors();

  // Subtle entry fade — single SharedValue cascades through the wrapping
  // Skia Group so line, area fill, zones and grid all appear in lockstep.
  // Data points then stagger in on top via their own per-index spring.
  const entryProgress = useSharedValue(0);
  useEffect(() => {
    entryProgress.set(withTiming(1, { duration: TIMING_CONFIG.SLOW.duration }));
  }, [entryProgress]);

  // Validate dataPoints to prevent frozen object errors (React Compiler auto-memoizes)
  const validDataPoints = dataPoints.filter(
    point =>
      point &&
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      typeof point.label === 'string' &&
      typeof point.value === 'string' &&
      !Number.isNaN(point.x) &&
      !Number.isNaN(point.y),
  );

  const canvasStyle = { width: resolvedWidth, height };

  // Active cursor (React Compiler auto-memoizes)
  let activeCursor = null;
  if (tooltip.visible) {
    const x = Math.max(0, Math.min(tooltip.x, resolvedWidth));
    activeCursor = (
      <View
        pointerEvents="none"
        style={[
          styles.cursor,
          {
            left: x,
            height,
            backgroundColor: colors.chartAccent,
            opacity: CHART_OPACITY.LOW,
          },
        ]}
      />
    );
  }

  return (
    <View style={[styles.container, { width: resolvedWidth, height }]}>
      {/* Main Chart Canvas */}
      <Pressable
        testID="chart-background"
        accessible={false}
        importantForAccessibility="no"
        style={StyleSheet.absoluteFill}
        onPress={hideTooltip}
      >
        <Canvas style={canvasStyle}>
          <Group opacity={entryProgress}>{children}</Group>
        </Canvas>
      </Pressable>

      {/* Interactive Data Point Overlays */}
      {validDataPoints.map(point => {
        return (
          <DataPointOverlay
            key={`data-point-${Math.round(point.x)}-${Math.round(point.y)}`}
            label={point.label}
            value={point.value}
            x={point.x}
            y={point.y}
            onPress={showTooltip}
          />
        );
      })}

      {/* Active cursor when tooltip is shown */}
      {activeCursor}

      {/* Tooltip Component */}
      <ChartTooltipData maxWidth={width || resolvedWidth} tooltip={tooltip} />
    </View>
  );
}

ChartCanvas.displayName = 'ChartCanvas';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.CHART.BADGE_PADDING,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
  badgeDot: {
    width: STATUS_INDICATOR.DOT_SIZE,
    height: STATUS_INDICATOR.DOT_SIZE,
    borderRadius: STATUS_INDICATOR.DOT_RADIUS,
    marginRight: LAYOUT.CHART.BADGE_DOT_MARGIN,
  },
  badgeText: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
  },
  cursor: {
    position: 'absolute',
    width: LAYOUT.CHART.CURSOR_WIDTH,
    top: 0,
  },
});
