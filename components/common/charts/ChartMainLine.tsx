import { CHART_VISUAL } from './constants';
import { Path } from '@shopify/react-native-skia';
import { memo } from 'react';

import type { ChartColors } from '@/types/ui/chart.types';

interface ChartMainLineProps {
  path: string;
  chartColors: ChartColors;
}

/**
 * Shared main line component for all vocabulary charts
 * Renders the consistent tint-colored main line with rounded caps
 */
export const ChartMainLine = memo<ChartMainLineProps>(({ path, chartColors }) => {
  if (!path) return null;

  return (
    <Path
      color={chartColors.ui.dataLine}
      path={path}
      strokeCap="round"
      strokeJoin="round"
      strokeWidth={CHART_VISUAL.LINE_WIDTH}
      style="stroke"
    />
  );
});

ChartMainLine.displayName = 'ChartMainLine';
