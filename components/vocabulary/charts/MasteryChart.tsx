import {
  Path,
  Circle,
  Group,
  Rect,
  LinearGradient,
  vec,
  Mask,
} from '@shopify/react-native-skia';
import { memo } from 'react';
import { View } from 'react-native';


import {
  BaseChart,
  ChartCanvas,
  ChartGrid,
  ChartAxes,
  Y_AXIS_WIDTH,
} from '@/components/vocabulary/shared';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/vocabulary/shared/chartMessages';
import { useGraphWidth, GRAPH_HEIGHT_LARGE, CHART_VISUAL } from '@/components/vocabulary/shared/constants';
import { createAreaFillPath } from '@/components/vocabulary/shared/utils';
import { useColors } from '@/hooks/theme/useColors';
import { useMasteryChart } from '@/hooks/vocabulary/useMasteryChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

export const MasteryChart = memo(
  ({ studyWords = [], onInfoPress, hideTitle = false }: MasteryChartProps) => {
    const chartColors = useChartColors();
    const colors = useColors();
    const graphWidth = useGraphWidth();

    // Add top padding to prevent dots from being cut off
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING; // Optimized space for data points


    const {
      masteryPath,
      hasData,
      performanceZones,
      milestones,
      points,
      tooltipPoints: dataPoints,
      subtitle,
      xLabelPositions,
      xLabels,
    } = useMasteryChart(studyWords);
    return (
      <BaseChart
        contentHeight={GRAPH_HEIGHT_LARGE + 32}
        emptyStateText={EMPTY_STATE_MESSAGES.mastery}
        hasData={hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={CHART_LABELS.STRENGTH}
        onInfoPress={onInfoPress}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
            >
              {/* Subtle grid lines for better visual structure */}
              <ChartGrid
                gridLines={4}
                height={GRAPH_HEIGHT_LARGE}
                topPadding={TOP_PADDING}
                width={graphWidth}
              />

              {/* Area fill under the mastery line with gradient - rendered first as base */}
              <Group>
                {masteryPath && points.length > 0 && (
                  <Path
                    path={createAreaFillPath(
                      masteryPath,
                      graphWidth,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      colors={chartColors.getAreaFillGradient('mastery')}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      positions={[0, 0.25, 0.65, 1]}
                      start={vec(0, TOP_PADDING)}
                    />
                  </Path>
                )}
              </Group>

              {/* Standardized performance zones background - masked to only show below the data line */}
              <Group>
                {masteryPath && points.length > 0 && (
                  <Mask
                    mask={
                      <Path
                        color={colors.white}
                        path={createAreaFillPath(
                          masteryPath,
                          graphWidth,
                          GRAPH_HEIGHT_LARGE
                        )}
                      />
                    }
                  >
                    {performanceZones?.map(zone => (
                      <Rect
                        key={`performance-zone-${zone.min}-${zone.max}`}
                        color={chartColors.withOpacity(zone.color, 0.25)}
                        height={zone.height}
                        width={graphWidth}
                        x={0}
                        y={zone.y}
                      />
                    ))}
                  </Mask>
                )}
              </Group>

              {/* Main mastery line with brand accent color */}
              <Group>
                {masteryPath && points.length > 0 && (
                  <Path
                    color={chartColors.ui.accent}
                    path={masteryPath}
                    strokeCap="round"
                    strokeJoin="round"
                    strokeWidth={CHART_VISUAL.LINE_WIDTH}
                    style="stroke"
                  />
                )}

                {/* Data points with enhanced styling */}
                {points.map(point => (
                  <Group key={`mastery-point-${point.date.toISOString()}`}>
                    {/* Enhanced data point with border */}
                    <Circle
                      color={chartColors.ui.accent}
                      cx={point.x}
                      cy={point.y}
                      r={CHART_VISUAL.DATA_POINT_SIZE}
                    />
                    <Circle
                      color={chartColors.ui.background}
                      cx={point.x}
                      cy={point.y}
                      r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
                    />
                  </Group>
                ))}
              </Group>

              {/* Subtle milestone indicators */}
              <Group>
                {milestones.map(milestone => (
                  <Group key={`milestone-${milestone.rate}-${milestone.date.toISOString()}`}>
                    {/* Subtle milestone indicator - much smaller */}
                    <Circle
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.15)}
                      cx={milestone.x}
                      cy={milestone.y}
                      r={CHART_VISUAL.MILESTONE_SIZE}
                    />
                    <Circle
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.8)}
                      cx={milestone.x}
                      cy={milestone.y}
                      r={CHART_VISUAL.MILESTONE_INNER_SIZE}
                    />
                  </Group>
                ))}
              </Group>
            </ChartCanvas>
          </View>

          {/* Enhanced axis labels with proper padding and y-axis values */}
          <ChartAxes
            height={GRAPH_HEIGHT_LARGE}
            showYAxis={true}
            topPadding={TOP_PADDING}
            width={graphWidth}
            xLabelPositions={xLabelPositions}
            yMax={100}
            xLabels={xLabels}
          />
        </View>
      </BaseChart>
    );
  }
);

MasteryChart.displayName = 'MasteryChart';

// Styles removed - now using ChartAxes component
