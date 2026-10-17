import { CHART_VISUAL } from '@/constants/chartConstants';
import { Path, Skia } from 'react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import type { ChartColors } from '@/types/ui/chart.types';

interface ChartMainLineProps {
  path: string;
  chartColors: ChartColors;
}

/**
 * Shared main line component for all vocabulary charts.
 * 2px accent stroke with rounded caps, drawn in left-to-right on mount
 * via Skia path trimming driven by a Reanimated shared value.
 */
export const ChartMainLine = memo<ChartMainLineProps>(({ path, chartColors }) => {
  // Trim animation needs an SkPath — convert the SVG string once per path
  const skPath = useMemo(() => (path ? Skia.Path.MakeFromSVGString(path) : null), [path]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(0);
    progress.set(withTiming(1, TIMING_CONFIG.PROGRESS));
  }, [progress, path]);

  if (!skPath) return null;

  return (
    <Path
      color={chartColors.ui.dataLine}
      path={skPath}
      start={0}
      end={progress}
      strokeCap="round"
      strokeJoin="round"
      strokeWidth={CHART_VISUAL.LINE_WIDTH}
      style="stroke"
    />
  );
});

ChartMainLine.displayName = 'ChartMainLine';
