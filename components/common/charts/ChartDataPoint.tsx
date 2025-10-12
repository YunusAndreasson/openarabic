import { CHART_VISUAL } from '@charts/constants';
import { Circle, Group } from '@shopify/react-native-skia';
import { memo } from 'react';

import type { ChartColors } from '@/types/ui/chart.types';

interface ChartDataPointProps {
  x: number;
  y: number;
  uniqueKey?: string;
  chartColors: ChartColors;
}

/**
 * Shared data point component for all vocabulary charts
 * Renders the consistent dual-circle design with golden colors
 */
export const ChartDataPoint = memo<ChartDataPointProps>(({
  x,
  y,
  uniqueKey,
  chartColors,
}) => {

  return (
    <Group key={uniqueKey}>
      {/* Outer circle with golden primary color */}
      <Circle
        color={chartColors.dataPoint.primary}
        cx={x}
        cy={y}
        r={CHART_VISUAL.DATA_POINT_SIZE}
      />

      {/* Inner circle with golden inner color for subtle depth */}
      <Circle
        color={chartColors.dataPoint.inner}
        cx={x}
        cy={y}
        r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
      />
    </Group>
  );
});

ChartDataPoint.displayName = 'ChartDataPoint';
