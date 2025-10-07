
import { useChartColors } from '@charts/ChartColors';
import { GRAPH_HEIGHT_LARGE } from '@charts/constants';
import { createAreaFillPath } from '@charts/utils';
import { Mask, Path, Rect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import type { PerformanceZone } from '@/types/ui/chart.types';

interface ChartPerformanceZonesProps {
  zones: PerformanceZone[];
  maskPath: string;
  graphWidth: number;
}

/**
 * Shared performance zones component for all vocabulary charts
 * Renders the color-coded zones masked under the main line
 * Extends to full chart width (0 to graphWidth) for complete coverage
 */
export const ChartPerformanceZones = memo<ChartPerformanceZonesProps>(
  ({ zones, maskPath, graphWidth }) => {
    const colors = useColors();
    const chartColors = useChartColors();

    const areaPath = useMemo(
      () => (maskPath ? createAreaFillPath(maskPath, graphWidth, GRAPH_HEIGHT_LARGE) : ''),
      [maskPath, graphWidth]
    );

    if (!maskPath || zones.length === 0 || !areaPath) return null;

    return (
      <Mask mask={<Path color={colors.white} path={areaPath} />}>
        {zones.map(zone => (
          <Rect
            key={`performance-zone-${zone.color}-${zone.y}-${zone.height}`}
            color={chartColors.withOpacity(zone.color, 0.35)}
            height={zone.height}
            width={graphWidth}
            x={0}
            y={zone.y}
          />
        ))}
      </Mask>
    );
  }
);

ChartPerformanceZones.displayName = 'ChartPerformanceZones';
