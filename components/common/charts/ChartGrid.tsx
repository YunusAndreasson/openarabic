import { Group, Line } from '@shopify/react-native-skia';

import type { ChartColors } from '@/types/ui/chart.types';

interface ChartGridProps {
  width: number;
  height: number;
  topPadding?: number;
  xLabelPositions?: number[]; // X positions for vertical grid lines (daily positions)
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  chartColors: ChartColors;
}

/**
 * Subtle grid component for charts to improve visual structure
 * without overwhelming the data visualization
 */
export function ChartGrid({
  width,
  height,
  topPadding = 0,
  xLabelPositions = [],
  yMax = 100,
  chartColors,
}: ChartGridProps) {
  // Beautiful, subtle grid lines - perfect opacity for readability without distraction
  const gridColor = chartColors.ui.grid;

  // Slightly more prominent border lines for clean chart definition
  const borderColor = chartColors.ui.border;

  // Horizontal lines at exact percentages (25%, 50%, 75%, 100%) for perfect value reading
  const chartHeight = height - topPadding;
  const percentages = [25, 50, 75, 100];
  const horizontalLines = percentages.map(percentage => {
    const yPosition = topPadding + chartHeight - (percentage / yMax) * chartHeight;
    return { y: yPosition, percentage };
  });

  // Vertical lines at daily positions for temporal reference
  const verticalLines = xLabelPositions.map(x => ({ x })).filter(v => v.x !== undefined);

  return (
    <Group>
      {/* Horizontal grid lines at exact percentages */}
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

      {/* Vertical grid lines for daily reference */}
      {verticalLines.map(({ x }) => (
        <Line
          key={`vertical-grid-line-${x}`}
          color={gridColor}
          p1={{ x, y: topPadding }}
          p2={{ x, y: height }}
          strokeWidth={0.75}
          style="stroke"
        />
      ))}

      {/* Perfect chart borders for professional definition */}
      {/* Bottom border (x-axis) - clean baseline */}
      <Line
        key="x-axis-border"
        color={borderColor}
        p1={{ x: 0, y: height }}
        p2={{ x: width, y: height }}
        strokeWidth={1.25}
        style="stroke"
      />

      {/* Left border (y-axis) - clean left edge */}
      <Line
        key="y-axis-border"
        color={borderColor}
        p1={{ x: 0, y: topPadding }}
        p2={{ x: 0, y: height }}
        strokeWidth={1.25}
        style="stroke"
      />
    </Group>
  );
}

ChartGrid.displayName = 'ChartGrid';
