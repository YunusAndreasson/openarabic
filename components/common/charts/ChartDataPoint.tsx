import { Circle, Group } from '@shopify/react-native-skia';
import { memo } from 'react';

import { useChartColors } from '@charts/chartColors';
import { CHART_VISUAL } from '@charts/constants';

interface ChartDataPointProps {
  x: number;
  y: number;
  uniqueKey?: string;
  isToday?: boolean; // Whether this data point represents today
}

/**
 * Shared data point component for all vocabulary charts
 * Renders the consistent dual-circle design with golden colors
 * Adds layered halo effect for today's data point to make it visually distinct
 */
export const ChartDataPoint = memo<ChartDataPointProps>(({ x, y, uniqueKey, isToday = false }) => {
  const chartColors = useChartColors();

  return (
    <Group key={uniqueKey}>
      {/* Layered halo effect for today's data point */}
      {isToday && (
        <>
          {/* Outer glow - very subtle for ambient effect */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.06)}
            cx={x}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 5}
          />
          {/* Outer halo - subtle */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.12)}
            cx={x}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 4}
          />
          {/* Middle halo - medium visible */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.2)}
            cx={x}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 3}
          />
          {/* Inner halo - more prominent */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.3)}
            cx={x}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 2.2}
          />
        </>
      )}

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
