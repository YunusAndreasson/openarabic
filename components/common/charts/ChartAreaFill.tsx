import { GRAPH_HEIGHT_LARGE } from '@/constants/chartConstants';
import { createAreaFillPath } from '@/utils/chartDataUtils';
import { Group, Path } from 'react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import type { ChartColors } from '@/types/ui/chart.types';

interface ChartAreaFillProps {
  path: string;
  graphWidth: number;
  chartColors: ChartColors;
}

/**
 * Shared area fill for all vocabulary charts: a single flat low-opacity
 * wash of the accent hue (no gradient, no blur). Fades in after the line's
 * draw-in lands so the wash appears beneath a finished line.
 */
export const ChartAreaFill = memo<ChartAreaFillProps>(({ path, graphWidth, chartColors }) => {
  const areaPath = useMemo(
    () => (path ? createAreaFillPath(path, GRAPH_HEIGHT_LARGE, undefined, graphWidth) : ''),
    [path, graphWidth],
  );

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(0);
    opacity.set(withDelay(TIMING_CONFIG.PROGRESS.duration, withTiming(1, TIMING_CONFIG.ENTRANCE)));
  }, [opacity, path]);

  if (!path || !areaPath) return null;

  return (
    <Group opacity={opacity}>
      <Path path={areaPath} color={chartColors.areaWash} />
    </Group>
  );
});

ChartAreaFill.displayName = 'ChartAreaFill';
