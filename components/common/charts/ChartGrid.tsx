import { Group, Line } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { useChartColors } from '@charts/ChartColors';

import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

interface ChartGridProps {
  width: number;
  height: number;
  topPadding?: number;
  xLabelPositions?: number[]; // X positions for vertical grid lines (daily positions)
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  showWarningLine?: boolean; // Whether to show the warning threshold line
}

/**
 * Subtle grid component for charts to improve visual structure
 * without overwhelming the data visualization
 */
export const ChartGrid = memo(
  ({
    width,
    height,
    topPadding = 0,
    xLabelPositions = [],
    yMax = 100,
    showWarningLine = false,
  }: ChartGridProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const chartColors = useChartColors();

    // Beautiful, subtle grid lines - perfect opacity for readability without distraction
    const gridColor = useMemo(
      () => withOpacity(isDarkMode ? colors.white : colors.black, 0.12),
      [isDarkMode, colors.white, colors.black]
    );

    // Slightly more prominent border lines for clean chart definition
    const borderColor = useMemo(
      () => withOpacity(isDarkMode ? colors.white : colors.black, 0.2),
      [isDarkMode, colors.white, colors.black]
    );

    // Threshold line colors are now handled per line in thresholdLines

    // Horizontal lines at exact percentages (25%, 50%, 75%, 100%) for perfect value reading
    const horizontalLines = useMemo(() => {
      const chartHeight = height - topPadding;
      const percentages = [25, 50, 75, 100];
      return percentages.map(percentage => {
        const yPosition = topPadding + chartHeight - (percentage / yMax) * chartHeight;
        return { y: yPosition, percentage };
      });
    }, [height, topPadding, yMax]);

    // Threshold lines at critical thresholds for vocabulary retention
    const thresholdLines = useMemo(() => {
      if (!showWarningLine) return [];

      const chartHeight = height - topPadding;
      const lines = [];

      // Red line at 40% (where red stops and yellow starts)
      const redLineY =
        topPadding + chartHeight - (MEMORY_CAPACITY_THRESHOLDS.POOR / yMax) * chartHeight;
      lines.push({
        y: redLineY,
        percentage: MEMORY_CAPACITY_THRESHOLDS.POOR,
        color: chartColors.performance.poor,
      });

      // Yellow line at 70% (where yellow stops and green starts)
      const yellowLineY =
        topPadding + chartHeight - (MEMORY_CAPACITY_THRESHOLDS.MODERATE / yMax) * chartHeight;
      lines.push({
        y: yellowLineY,
        percentage: MEMORY_CAPACITY_THRESHOLDS.MODERATE,
        color: chartColors.performance.moderate,
      });

      return lines;
    }, [
      showWarningLine,
      height,
      topPadding,
      yMax,
      chartColors.performance.poor,
      chartColors.performance.moderate,
    ]);

    // Vertical lines at daily positions for temporal reference
    const verticalLines = useMemo(() => {
      return xLabelPositions.map(x => ({ x })).filter(v => v.x !== undefined);
    }, [xLabelPositions]);

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

        {/* Threshold lines at critical retention levels */}
        {thresholdLines.map(line => (
          <Line
            key={`threshold-line-${line.percentage}%`}
            color={line.color}
            p1={{ x: 0, y: line.y }}
            p2={{ x: width, y: line.y }}
            strokeWidth={2}
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
);

ChartGrid.displayName = 'ChartGrid';
