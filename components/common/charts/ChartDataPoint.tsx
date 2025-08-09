import { Circle, Group } from '@shopify/react-native-skia';
import { memo } from 'react';

import { useChartColors } from '@charts/chartColors';
import { CHART_VISUAL } from '@charts/constants';

import { useColors } from '@/hooks/theme/useColors';

interface ChartDataPointProps {
  x: number;
  y: number;
  uniqueKey?: string;
}

/**
 * Shared data point component for all vocabulary charts
 * Renders the consistent dual-circle design with tint color
 */
export const ChartDataPoint = memo<ChartDataPointProps>(({ x, y, uniqueKey }) => {
  const colors = useColors();
  const chartColors = useChartColors();

  return (
    <Group key={uniqueKey}>
      {/* Outer circle with full tint color */}
      <Circle color={colors.tint} cx={x} cy={y} r={CHART_VISUAL.DATA_POINT_SIZE} />
      {/* Inner circle with 25% opacity for subtle depth */}
      <Circle
        color={chartColors.withOpacity(colors.tint, 0.25)}
        cx={x}
        cy={y}
        r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
      />
    </Group>
  );
});

ChartDataPoint.displayName = 'ChartDataPoint';
