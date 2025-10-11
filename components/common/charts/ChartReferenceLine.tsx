import { Line } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

interface ChartReferenceLineProps {
  percentage: number; // The percentage value to draw the line at (e.g., 75 for 75%)
  graphWidth: number;
  chartHeight: number;
  topPadding?: number;
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
}

/**
 * Renders a soft horizontal reference line at a specific percentage value
 * Used to indicate target thresholds (e.g., 75% memory retention target)
 */
export const ChartReferenceLine = memo<ChartReferenceLineProps>(
  ({ percentage, graphWidth, chartHeight, topPadding = 0, yMax = 100 }) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();

    // Soft, subtle color for the reference line - slightly more visible than grid lines
    const lineColor = useMemo(
      () => withOpacity(isDarkMode ? colors.white : colors.black, 0.38),
      [isDarkMode, colors.white, colors.black]
    );

    // Calculate Y position for the reference line
    const yPosition = useMemo(() => {
      const effectiveHeight = chartHeight - topPadding;
      return topPadding + effectiveHeight - (percentage / yMax) * effectiveHeight;
    }, [percentage, chartHeight, topPadding, yMax]);

    return (
      <Line
        color={lineColor}
        p1={{ x: 0, y: yPosition }}
        p2={{ x: graphWidth, y: yPosition }}
        strokeWidth={1.5}
        style="stroke"
      />
    );
  }
);

ChartReferenceLine.displayName = 'ChartReferenceLine';
