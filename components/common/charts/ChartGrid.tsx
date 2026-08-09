import { Group, Line } from '@shopify/react-native-skia';

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
          strokeWidth={1}
          style="stroke"
        />
      ))}

      {/* Baseline — same hairline weight as the grid, no heavier frame */}
      <Line
        key="baseline"
        color={gridColor}
        p1={{ x: 0, y: height }}
        p2={{ x: width, y: height }}
        strokeWidth={1}
        style="stroke"
      />
    </Group>
  );
}

ChartGrid.displayName = 'ChartGrid';
