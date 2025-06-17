import { Group, Line } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

interface ChartGridProps {
  width: number;
  height: number;
  gridLines?: number; // Number of horizontal grid lines
  topPadding?: number;
}

/**
 * Subtle grid component for charts to improve visual structure
 * without overwhelming the data visualization
 */
export const ChartGrid = memo(
  ({ width, height, gridLines = 4, topPadding = 0 }: ChartGridProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();

    const gridColor = useMemo(
      () => withOpacity(isDarkMode ? colors.white : colors.black, 0.06),
      [isDarkMode, colors.white, colors.black]
    );

    const lines = useMemo(() => {
      const gridSpacing = (height - topPadding) / (gridLines + 1);
      const result: number[] = [];
      for (let i = 1; i <= gridLines; i++) {
        result.push(topPadding + i * gridSpacing);
      }
      return result;
    }, [height, topPadding, gridLines]);

    return (
      <Group>
        {lines.map(y => (
          <Line
            key={`grid-line-${y}`}
            color={gridColor}
            p1={{ x: 0, y }}
            p2={{ x: width, y }}
            strokeWidth={0.5}
            style="stroke"
          />
        ))}
      </Group>
    );
  }
);

ChartGrid.displayName = 'ChartGrid';
