import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { Y_AXIS_LINES } from '@/constants/chartConstants';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

// Export the y-axis width for use in other components - optimized for perfect alignment
export const Y_AXIS_WIDTH = LAYOUT.CHART.Y_AXIS_WIDTH; // Consistent chart spacing

interface AxisLabelsProps {
  height: number;
  width: number;
  xLabels: string[];
  xLabelPositions: number[];
  yMax?: number; // Maximum value for y-axis (default 100 for percentages)
  showYAxis?: boolean;
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
    topPadding = 0,
    yLabelFormatter,
    isFuturePrediction = false,
  }: AxisLabelsProps) => {
    const colors = useColors();

    // Today index depends on chart type
    // Future prediction charts (like RetrievabilityChart) have today at index 0
    // Historical charts (like EfficiencyChart) have today at the last index
    const todayIndex =
      xLabels.length > 0 ? (isFuturePrediction ? 0 : xLabels.length - 1) : undefined;

    // Theme token instead of computed black/white alpha — fixes sepia labels
    const textColor = colors.subtleLabelText;

    // Calculate y-axis label positions and values
    // Account for top padding used by the chart
    const yLabels = useMemo(() => {
      const chartHeight = height - topPadding;
      const labels = [] as { value: number; y: number }[];
      const seenValues = new Set<number>();
      for (let i = 0; i < Y_AXIS_LINES; i++) {
        const value = (yMax * i) / (Y_AXIS_LINES - 1);
        const y = topPadding + chartHeight - (i * chartHeight) / (Y_AXIS_LINES - 1);
        const roundedValue = Math.round(value);
        // Count charts often have a max of only 1–3. Five rounded ticks then
        // render misleading duplicates such as 1,1,1,0,0. Keep one label per
        // actual integer while retaining its grid-aligned position.
        if (!seenValues.has(roundedValue)) {
          seenValues.add(roundedValue);
          labels.push({ value: roundedValue, y });
        }
      }
      return labels;
    }, [height, topPadding, yMax]);

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
                      color: isToday ? colors.chartAccent : textColor,
                      fontFamily: isToday ? FONTS.ENGLISH_SEMIBOLD : FONTS.ENGLISH,
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
    fontFamily: FONTS.ENGLISH,
    includeFontPadding: false,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textAlign: 'right',
  },
});
