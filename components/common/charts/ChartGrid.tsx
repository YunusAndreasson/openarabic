import { Group, Line } from 'react-native-skia';
import { StyleSheet } from 'react-native';

import { ChartBaseline } from './ChartBaseline';

import type { ChartColors } from '@/types/ui/chart.types';

interface ChartGridProps {
  width: number;
  height: number;
  topPadding?: number;
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  chartColors: ChartColors;
}

/**
 * Recessive grid: solid 1px hairlines at 25/50/75/100% plus a baseline,
 * all one step off the surface. No vertical lines (x labels carry the days)
 * and no axis frame — the data is the only loud element.
 */
export function ChartGrid({ width, height, topPadding = 0, chartColors }: ChartGridProps) {
  const gridColor = chartColors.ui.grid;

  // Horizontal lines at exact percentages (25%, 50%, 75%, 100%) for value reading
  const chartHeight = height - topPadding;
  const percentages = [25, 50, 75, 100];
  const horizontalLines = percentages.map(percentage => {
    // These are normalized grid positions, not data values. Dividing by yMax
    // pushed every line off-canvas on count charts whose maximum was below 25.
    const yPosition = topPadding + chartHeight - (percentage / 100) * chartHeight;
    return { y: yPosition, percentage };
  });

  return (
    <Group>
      {horizontalLines.map(line => (
        <Line
          key={`grid-line-${line.percentage}%`}
          color={gridColor}
          p1={{ x: 0, y: line.y }}
          p2={{ x: width, y: line.y }}
          strokeWidth={StyleSheet.hairlineWidth}
          style="stroke"
        />
      ))}

      {/* Baseline — the shared one, so this chart's floor matches the sparklines'.
          The grid lines above moved to the same weight with it: they used to be
          `strokeWidth={1}` under a comment calling that "the same hairline weight
          as the grid", and changing only the baseline would have left the axis
          floor FINER than the recessive lines above it — the inverse of the
          hierarchy either version was aiming at. */}
      <ChartBaseline width={width} y={height} color={gridColor} />
    </Group>
  );
}

ChartGrid.displayName = 'ChartGrid';
