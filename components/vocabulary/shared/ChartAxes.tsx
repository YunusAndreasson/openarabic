import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

// Export the y-axis width for use in other components - optimized for perfect alignment
export const Y_AXIS_WIDTH = LAYOUT.CHART.Y_AXIS_WIDTH; // Consistent chart spacing

interface AxisLabelsProps {
  width: number;
  height: number;
  xLabels: string[];
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  xLabelPositions: number[]; // X positions for each label
  showYAxis?: boolean;
  yAxisLines?: number; // Number of y-axis labels (default 5 for 0%, 25%, 50%, 75%, 100%)
  topPadding?: number; // Top padding used by the chart for proper y-axis alignment
}

/**
 * Comprehensive axis labels component for charts with proper padding and alignment
 */
export const ChartAxes = memo(
  ({
    width,
    height,
    xLabels,
    yMax = 100,
    xLabelPositions,
    showYAxis = true,
    yAxisLines = 5,
    topPadding = 0,
  }: AxisLabelsProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const textColor = useMemo(
      () => (isDarkMode ? withOpacity(colors.white, 0.7) : withOpacity(colors.black, 0.7)),
      [isDarkMode, colors.white, colors.black]
    );

    // Calculate y-axis label positions and values
    // Account for top padding used by the chart
    const yLabels = useMemo(() => {
      const chartHeight = height - topPadding;
      const labels = [] as { value: number; y: number }[];
      for (let i = 0; i < yAxisLines; i++) {
        const value = (yMax * i) / (yAxisLines - 1);
        const y = topPadding + chartHeight - (i * chartHeight) / (yAxisLines - 1);
        labels.push({ value: Math.round(value), y });
      }
      return labels;
    }, [height, topPadding, yAxisLines, yMax]);

    // Use the exported Y_AXIS_WIDTH constant

    return (
      <View
        style={[
          styles.axesContainer,
          {
            width: width + (showYAxis ? Y_AXIS_WIDTH : 0),
            height: height + LAYOUT.SPACING.XXXLARGE, // Optimized space for x-axis labels
          },
        ]}
      >
        {/* Y-Axis Labels */}
        {showYAxis && (
          <View style={[styles.yAxisContainer, { height, width: Y_AXIS_WIDTH }]}>
            {yLabels.map(label => (
              <View
                key={`y-label-${label.value}`}
                style={[
                  styles.yLabel,
                  {
                    top: Math.max(
                      0,
                      Math.min(label.y - LAYOUT.SPACING.SMALL, height - LAYOUT.SPACING.LARGE)
                    ), // Center the label with bounds check
                    width: Y_AXIS_WIDTH,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[
                    styles.yLabelText,
                    {
                      color: textColor,
                    },
                  ]}
                >
                  {label.value}%
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* X-Axis Labels */}
        <View
          style={[
            styles.xAxisContainer,
            {
              width: width,
              left: 0, // Remove the Y_AXIS_WIDTH offset since chart content already has margin
              top: height + 2, // Reduced gap between chart and labels for better alignment
              marginLeft: showYAxis ? Y_AXIS_WIDTH : 0, // Use margin instead to match chart content
            },
          ]}
        >
          {xLabels.map((label, index) => {
            const isToday = index === xLabels.length - 1; // Today is always the last label
            const position = xLabelPositions[index];

            if (position === undefined) return null;

            // Calculate label left position - consistently center all labels on their data points
            const labelWidth = MIN_TOUCH_TARGET.SMALL;
            const labelLeft = position - labelWidth / 2; // Always center on data point for even alignment

            return (
              <View
                key={`x-label-${label}`}
                style={[
                  styles.xLabel,
                  {
                    left: labelLeft,
                    width: labelWidth,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[
                    styles.xLabelText,
                    {
                      color: textColor,
                      fontWeight: isToday ? '600' : '500', // Make today bold
                    },
                  ]}
                >
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
);

ChartAxes.displayName = 'ChartAxes';

const styles = StyleSheet.create({
  axesContainer: {
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
  },
  xAxisContainer: {
    height: LAYOUT.SPACING.XXLARGE, // Reduced container height for better proportions
    marginBottom: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
  },
  xLabel: {
    alignItems: 'center',
    height: LAYOUT.SPACING.MEDIUM * 1.5, // Reduced label height for tighter spacing
    justifyContent: 'center', // Center labels within container
    position: 'absolute',
  },
  xLabelText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
  yAxisContainer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  yLabel: {
    alignItems: 'flex-end',
    height: LAYOUT.SPACING.LARGE,
    justifyContent: 'center',
    paddingRight: LAYOUT.SPACING.TINY, // Minimal padding for tight layout
    position: 'absolute',
  },
  yLabelText: {
    fontSize: 10,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: 14,
    textAlign: 'right',
  },
});
