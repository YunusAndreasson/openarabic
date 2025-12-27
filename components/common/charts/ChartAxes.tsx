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
  height: number;
  width: number;
  xLabels: string[];
  xLabelPositions: number[];
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  showYAxis?: boolean;
  yAxisLines?: number;
  topPadding?: number;
  yLabelFormatter?: (value: number) => string;
  isFuturePrediction?: boolean; // Whether this chart shows future predictions (today = index 0)
}

/**
 * Comprehensive axis labels component for charts with proper padding and alignment
 *
 * ✅ FIXED: Rightmost label cutoff issue
 * - Intelligent boundary constraints prevent labels from extending beyond chart edges
 * - Edge labels use appropriate text alignment (left/right) for visual balance
 * - Maintains centered positioning for middle labels while ensuring full visibility
 */
export const ChartAxes = memo<AxisLabelsProps>(
  ({
    height,
    width,
    xLabels,
    xLabelPositions,
    yMax = 100,
    showYAxis = true,
    yAxisLines = 5,
    topPadding = 0,
    yLabelFormatter,
    isFuturePrediction = false,
  }: AxisLabelsProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();

    // Today index depends on chart type
    // Future prediction charts (like RetrievabilityChart) have today at index 0
    // Historical charts (like EfficiencyChart) have today at the last index
    const todayIndex =
      xLabels.length > 0 ? (isFuturePrediction ? 0 : xLabels.length - 1) : undefined;

    const textColor = useMemo(
      () => (isDarkMode ? withOpacity(colors.white, 0.7) : withOpacity(colors.black, 0.7)),
      [isDarkMode, colors.white, colors.black],
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

    // Center each weekday exactly under its tick (no edge constraints to avoid misalignment)
    const labelPositions = useMemo(() => {
      const labelWidth = MIN_TOUCH_TARGET.MEDIUM; // consistent width
      const halfLabelWidth = labelWidth / 2;

      return xLabelPositions.map(position => ({
        left: position - halfLabelWidth,
        width: labelWidth,
      }));
    }, [xLabelPositions]);

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
                key={`y-label-${label.value}-${label.y}`}
                style={[
                  styles.yLabel,
                  {
                    top: Math.max(
                      0,
                      Math.min(label.y - LAYOUT.SPACING.SMALL, height - LAYOUT.SPACING.LARGE),
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
                  {yLabelFormatter ? yLabelFormatter(label.value) : `${label.value}%`}
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
              left: 0,
              top: height + 2, // Reduced gap between chart and labels for better alignment
              marginLeft: showYAxis ? Y_AXIS_WIDTH : 0, // Use margin instead to match chart content
            },
          ]}
        >
          {xLabels.map((label, index) => {
            const isToday = index === todayIndex; // Current day is distinguished by color/weight
            const position = xLabelPositions[index];
            const labelConfig = labelPositions[index];

            if (position === undefined || !labelConfig) return null;

            return (
              <View
                key={`x-label-${label}`}
                style={[
                  styles.xLabel,
                  {
                    left: labelConfig.left,
                    width: labelConfig.width,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[
                    styles.xLabelText,
                    {
                      color: isToday ? colors.tint : textColor,
                      fontWeight: isToday ? '700' : '400', // More contrast: 700 vs 400
                      textAlign: 'center',
                      opacity: isToday ? 1 : 0.6, // Today stands out more
                    },
                  ]}
                >
                  {isToday ? 'Today' : label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  },
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textAlign: 'right',
  },
});
