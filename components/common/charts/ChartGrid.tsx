import { Group, Line } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

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

    // Threshold line color - orange for threshold warning
    const thresholdLineColor = useMemo(() => colors.warning, [colors.warning]);

    // Horizontal lines at exact percentages (25%, 50%, 75%, 100%) for perfect value reading
    const horizontalLines = useMemo(() => {
      const chartHeight = height - topPadding;
      const percentages = [25, 50, 75, 100];
      return percentages.map(percentage => {
        const yPosition = topPadding + chartHeight - (percentage / yMax) * chartHeight;
        return { y: yPosition, percentage };
      });
    }, [height, topPadding, yMax]);

    // Threshold line at warning threshold - critical threshold for vocabulary retention
    const thresholdLine = useMemo(() => {
      if (!showWarningLine) return null;
      const chartHeight = height - topPadding;
      const yPosition =
        topPadding + chartHeight - (MEMORY_CAPACITY_THRESHOLDS.GOOD / yMax) * chartHeight;
      return { y: yPosition, percentage: MEMORY_CAPACITY_THRESHOLDS.GOOD };
    }, [showWarningLine, height, topPadding, yMax]);

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

        {/* Threshold line at warning threshold - critical retention level */}
        {thresholdLine && (
          <Line
            key={`threshold-line-${thresholdLine.percentage}%`}
            color={thresholdLineColor}
            p1={{ x: 0, y: thresholdLine.y }}
            p2={{ x: width, y: thresholdLine.y }}
            strokeWidth={2}
            style="stroke"
          />
        )}

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
