import { Rect, Mask, Path } from '@shopify/react-native-skia';
import { memo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { GRAPH_HEIGHT_LARGE } from '@/components/vocabulary/shared/constants';
import { createAreaFillPath } from '@/components/vocabulary/shared/utils';
import { useColors } from '@/hooks/theme/useColors';

interface PerformanceZone {
  color: string;
  y: number;
  height: number;
}

interface ChartPerformanceZonesProps {
  zones: PerformanceZone[];
  maskPath: string;
  graphWidth: number;
}

/**
 * Shared performance zones component for all vocabulary charts
 * Renders the color-coded zones masked under the main line
 */
export const ChartPerformanceZones = memo<ChartPerformanceZonesProps>(
  ({ zones, maskPath, graphWidth }) => {
    const colors = useColors();
    const chartColors = useChartColors();

    if (!maskPath || zones.length === 0) return null;

    return (
      <Mask
        mask={
          <Path
            color={colors.white}
            path={createAreaFillPath(maskPath, graphWidth, GRAPH_HEIGHT_LARGE)}
          />
        }
      >
        {zones.map(zone => (
          <Rect
            key={`performance-zone-${zone.color}-${zone.y}-${zone.height}`}
            color={chartColors.withOpacity(zone.color, 0.25)}
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
