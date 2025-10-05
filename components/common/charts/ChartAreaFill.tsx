
import { useChartColors } from '@charts/ChartColors';
import { GRAPH_HEIGHT_LARGE } from '@charts/constants';
import { createAreaFillPath } from '@charts/utils';
import { LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

interface ChartAreaFillProps {
  path: string;
  graphWidth: number;
  topPadding?: number;
}

/**
 * Shared area fill component for all vocabulary charts
 * Renders the consistent gradient area fill under the main line
 */
// Skia LinearGradient positions expect a mutable number[] type in our TS setup
const GRADIENT_STOPS: number[] = [0, 0.3, 0.7, 1];

export const ChartAreaFill = memo<ChartAreaFillProps>(({ path, graphWidth, topPadding = 0 }) => {
  const chartColors = useChartColors();

  const areaPath = useMemo(
    () => (path ? createAreaFillPath(path, graphWidth, GRAPH_HEIGHT_LARGE) : ''),
    [path, graphWidth]
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
});

ChartAreaFill.displayName = 'ChartAreaFill';
