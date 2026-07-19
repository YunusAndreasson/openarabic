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
  /** Emphasized point (today/endpoint): larger dot with a surface ring */
  emphasis?: boolean;
}

const STAGGER_PER_POINT_MS = 60;

/**
 * Shared data point component for all vocabulary charts.
 * Intermediate points are small accent dots riding the line; the emphasized
 * point (today/endpoint) is larger and carries a card-colored surface ring
 * so it stays legible where it crosses the line. Points stagger in
 * left-to-right, landing as the line's draw-in completes.
 */
export const ChartDataPoint = memo<ChartDataPointProps>(
  ({ x, y, uniqueKey, chartColors, index = 0, emphasis = false }) => {
    const scale = useSharedValue(0);

    useEffect(() => {
      scale.value = withDelay(
        TIMING_CONFIG.PROGRESS.duration + index * STAGGER_PER_POINT_MS,
        withSpring(1, SPRING_CONFIG.CARD),
      );
    }, [scale, index]);

    const dotRadius = emphasis
      ? CHART_VISUAL.DATA_POINT_EMPHASIS_SIZE
      : CHART_VISUAL.DATA_POINT_SIZE;
    const ringRadius = dotRadius + CHART_VISUAL.DATA_POINT_RING_WIDTH;

    const animatedDotR = useDerivedValue(() => {
      'worklet';
      return scale.value * dotRadius;
    });
    const animatedRingR = useDerivedValue(() => {
      'worklet';
      return scale.value * ringRadius;
    });

    return (
      <Group key={uniqueKey}>
        {emphasis && <Circle color={chartColors.dataPoint.inner} cx={x} cy={y} r={animatedRingR} />}
        <Circle color={chartColors.dataPoint.primary} cx={x} cy={y} r={animatedDotR} />
      </Group>
    );
  },
);

ChartDataPoint.displayName = 'ChartDataPoint';
