import { useChartColors } from '@charts/ChartColors';
import { CHART_VISUAL, TODAY_HALO_RADIUS } from '@charts/constants';
import { Circle, Group } from '@shopify/react-native-skia';
import { memo } from 'react';


interface ChartDataPointProps {
  x: number;
  y: number;
  uniqueKey?: string;
  isToday?: boolean; // Whether this data point represents today
  isFirstPoint?: boolean; // Whether this is the first data point (needs right padding)
  isLastPoint?: boolean; // Whether this is the last data point (needs left padding)
}

/**
 * Shared data point component for all vocabulary charts
 * Renders the consistent dual-circle design with golden colors
 * Adds layered halo effect for today's data point to make it visually distinct
 * Applies padding offset for edge points to prevent clipping while keeping line/fill at edges
 */
export const ChartDataPoint = memo<ChartDataPointProps>(({
  x,
  y,
  uniqueKey,
  isToday = false,
  isFirstPoint = false,
  isLastPoint = false,
}) => {
  const chartColors = useChartColors();

  // Apply padding offset for edge dots to prevent clipping
  // First point needs to move right, last point needs to move left
  let adjustedX = x;

  if (isFirstPoint) {
    adjustedX = x + TODAY_HALO_RADIUS;
  } else if (isLastPoint) {
    adjustedX = x - TODAY_HALO_RADIUS;
  }

  return (
    <Group key={uniqueKey}>
      {/* Layered halo effect for today's data point */}
      {isToday && (
        <>
          {/* Outer glow - very subtle for ambient effect */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.06)}
            cx={adjustedX}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 5}
          />
          {/* Outer halo - subtle */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.12)}
            cx={adjustedX}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 4}
          />
          {/* Middle halo - medium visible */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.2)}
            cx={adjustedX}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 3}
          />
          {/* Inner halo - more prominent */}
          <Circle
            color={chartColors.withOpacity(chartColors.dataPoint.primary, 0.3)}
            cx={adjustedX}
            cy={y}
            r={CHART_VISUAL.DATA_POINT_SIZE * 2.2}
          />
        </>
      )}

      {/* Outer circle with golden primary color */}
      <Circle
        color={chartColors.dataPoint.primary}
        cx={adjustedX}
        cy={y}
        r={CHART_VISUAL.DATA_POINT_SIZE}
      />

      {/* Inner circle with golden inner color for subtle depth */}
      <Circle
        color={chartColors.dataPoint.inner}
        cx={adjustedX}
        cy={y}
        r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
      />
    </Group>
  );
});

ChartDataPoint.displayName = 'ChartDataPoint';
