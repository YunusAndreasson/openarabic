import { LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { useChartColors } from '@charts/chartColors';
import { GRAPH_HEIGHT_LARGE } from '@charts/constants';
import { createAreaFillPath } from '@charts/utils';

interface ChartAreaFillProps {
  path: string;
  graphWidth: number;
  topPadding?: number;
}

/**
 * Shared area fill component for all vocabulary charts
 * Renders the consistent gradient area fill under the main line
 */
const GRADIENT_STOPS = [0, 0.3, 0.7, 1] as const;

export const ChartAreaFill = memo<ChartAreaFillProps>(({ path, graphWidth, topPadding = 0 }) => {
  const chartColors = useChartColors();

  if (!path) return null;

  const areaPath = useMemo(
    () => createAreaFillPath(path, graphWidth, GRAPH_HEIGHT_LARGE),
    [path, graphWidth]
  );

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
});

ChartAreaFill.displayName = 'ChartAreaFill';
