import { Group, Line } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
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
    const colorScheme = useColorScheme();

    // Optimized grid color for perfect visual balance
    const gridColor =
      colorScheme === 'dark'
        ? withOpacity(Colors.dark.white, 0.06)
        : withOpacity(Colors.light.black, 0.06);

    // Calculate grid line positions
    const gridSpacing = (height - topPadding) / (gridLines + 1);
    const lines: number[] = [];

    for (let i = 1; i <= gridLines; i++) {
      lines.push(topPadding + i * gridSpacing);
    }

    return (
      <Group>
        {lines.map((y, index) => (
          <Line
            key={`grid-line-${index}`}
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
