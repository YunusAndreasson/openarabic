import { GRAPH_HEIGHT_LARGE } from '@/constants/chartConstants';
import { createAreaFillPath } from '@/utils/chartDataUtils';
import { LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import type { ChartColors } from '@/types/ui/chart.types';

interface ChartAreaFillProps {
  path: string;
  graphWidth: number;
  topPadding?: number;
  chartColors: ChartColors;
}

/**
 * Shared area fill component for all vocabulary charts
 * Renders the consistent gradient area fill under the main line
 * Extends to full chart width (0 to graphWidth) for complete coverage
 */
// Skia LinearGradient positions expect a mutable number[] type in our TS setup
const GRADIENT_STOPS: number[] = [0, 0.3, 0.7, 1];

export const ChartAreaFill = memo<ChartAreaFillProps>(
  ({ path, graphWidth, topPadding = 0, chartColors }) => {
    const areaPath = useMemo(
      () => (path ? createAreaFillPath(path, GRAPH_HEIGHT_LARGE, undefined, graphWidth) : ''),
      [path, graphWidth],
    );

    if (!path || !areaPath) return null;

    return (
      <Path path={areaPath}>
        <LinearGradient
          colors={chartColors.getAreaFillGradient()}
          end={vec(0, GRAPH_HEIGHT_LARGE)}
          positions={GRADIENT_STOPS}
          start={vec(0, topPadding)}
        />
      </Path>
    );
  },
);

ChartAreaFill.displayName = 'ChartAreaFill';
