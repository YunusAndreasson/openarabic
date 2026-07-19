import { GRAPH_HEIGHT_LARGE } from '@/constants/chartConstants';
import { createAreaFillPath } from '@/utils/chartDataUtils';
import { Group, Mask, Path, Rect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { CHART_OPACITY } from '@/constants/chartColors';
import type { PerformanceZone } from '@/types/ui/chart.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

interface ChartPerformanceZonesProps {
  zones: PerformanceZone[];
  maskPath: string;
  graphWidth: number;
  colors: ThemeColors;
  /** Band opacity — pass CHART_OPACITY.ZONE_DARK on dark surfaces */
  zoneOpacity?: number;
}

/**
 * Shared performance zones component for all vocabulary charts.
 * Renders crisp low-opacity status bands masked under the main line —
 * the reference line does the separation work, not blur.
 */
export const ChartPerformanceZones = memo<ChartPerformanceZonesProps>(
  ({ zones, maskPath, graphWidth, colors, zoneOpacity = CHART_OPACITY.ZONE }) => {
    const areaPath = useMemo(
      () =>
        maskPath ? createAreaFillPath(maskPath, GRAPH_HEIGHT_LARGE, undefined, graphWidth) : '',
      [maskPath, graphWidth],
    );

    if (!maskPath || zones.length === 0 || !areaPath) return null;

    return (
      <Mask mask={<Path color={colors.white} path={areaPath} />}>
        <Group>
          {zones.map(zone => (
            <Rect
              key={`performance-zone-${zone.color}-${zone.y}-${zone.height}`}
              color={withOpacity(zone.color, zoneOpacity)}
              height={zone.height}
              width={graphWidth}
              x={0}
              y={zone.y}
            />
          ))}
        </Group>
      </Mask>
    );
  },
);

ChartPerformanceZones.displayName = 'ChartPerformanceZones';
