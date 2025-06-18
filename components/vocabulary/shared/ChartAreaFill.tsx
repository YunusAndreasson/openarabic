import { Path, LinearGradient, vec } from '@shopify/react-native-skia';
import { memo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { GRAPH_HEIGHT_LARGE } from '@/components/vocabulary/shared/constants';
import { createAreaFillPath } from '@/components/vocabulary/shared/utils';

interface ChartAreaFillProps {
  path: string;
  graphWidth: number;
  topPadding?: number;
}

/**
 * Shared area fill component for all vocabulary charts
 * Renders the consistent gradient area fill under the main line
 */
export const ChartAreaFill = memo<ChartAreaFillProps>(({ path, graphWidth, topPadding = 0 }) => {
  const chartColors = useChartColors();

  if (!path) return null;

  return (
    <Path path={createAreaFillPath(path, graphWidth, GRAPH_HEIGHT_LARGE)}>
      <LinearGradient
        colors={chartColors.getAreaFillGradient()}
        end={vec(0, GRAPH_HEIGHT_LARGE)}
        positions={[0, 0.3, 0.7, 1]}
        start={vec(0, topPadding)}
      />
    </Path>
  );
});

ChartAreaFill.displayName = 'ChartAreaFill';
