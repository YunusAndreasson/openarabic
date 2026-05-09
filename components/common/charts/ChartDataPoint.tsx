import { CHART_VISUAL } from '@/constants/chartConstants';
import { Circle, Group } from '@shopify/react-native-skia';
import { memo, useEffect } from 'react';
import { useDerivedValue, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import type { ChartColors } from '@/types/ui/chart.types';

interface ChartDataPointProps {
  x: number;
  y: number;
  uniqueKey?: string;
  chartColors: ChartColors;
  /** Index in the parent series — drives the staggered scale-in on mount */
  index?: number;
}

const STAGGER_PER_POINT_MS = 60;

/**
 * Shared data point component for all vocabulary charts.
 * Renders the dual-circle design with golden colors and a left-to-right
 * staggered scale-in that lands after the chart line's fade-in completes.
 */
export const ChartDataPoint = memo<ChartDataPointProps>(
  ({ x, y, uniqueKey, chartColors, index = 0 }) => {
    const scale = useSharedValue(0);

    useEffect(() => {
      scale.value = withDelay(
        TIMING_CONFIG.SLOW.duration + index * STAGGER_PER_POINT_MS,
        withSpring(1, SPRING_CONFIG.CARD),
      );
    }, [scale, index]);

    const outerR = useDerivedValue(() => {
      'worklet';
      return scale.value * CHART_VISUAL.DATA_POINT_SIZE;
    });
    const innerR = useDerivedValue(() => {
      'worklet';
      return scale.value * CHART_VISUAL.DATA_POINT_INNER_SIZE;
    });

    return (
      <Group key={uniqueKey}>
        {/* Outer circle with golden primary color */}
        <Circle color={chartColors.dataPoint.primary} cx={x} cy={y} r={outerR} />

        {/* Inner circle with golden inner color for subtle depth */}
        <Circle color={chartColors.dataPoint.inner} cx={x} cy={y} r={innerR} />
      </Group>
    );
  },
);

ChartDataPoint.displayName = 'ChartDataPoint';
