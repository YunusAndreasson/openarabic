import {
  Path,
  Circle,
  Group,
  Rect,
  LinearGradient,
  vec,
  Mask,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';


import {
  BaseChart,
  ChartCanvas,
  ChartGrid,
  ChartAxes,
  Y_AXIS_WIDTH,
  type DataPoint,
} from '@/components/vocabulary/shared';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { generateChartSubtitle, CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/vocabulary/shared/chartMessages';
import {
  useGraphWidth,
  GRAPH_HEIGHT_LARGE,
  CHART_VISUAL,
} from '@/components/vocabulary/shared/constants';
import { createAreaFillPath } from '@/components/vocabulary/shared/utils';
import { useColors } from '@/hooks/theme/useColors';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress, hideTitle = false }: RetrievabilityChartProps) => {
    const chartColors = useChartColors();
    const colors = useColors();
    const graphWidth = useGraphWidth();
    const { retrievabilityData, chartData } = useRetrievabilityChart(studyWords);


    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return 'Study words to track memory retention';
      }

      // Use standardized subtitle generator
      return generateChartSubtitle.retrievability(currentRetrievability, criticalWords, totalWords);
    }, [chartData.insights, studyWords.length]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = retrievabilityData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.retrievability)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint;
        })
        .filter((point): point is DataPoint => point !== null);
    }, [chartData.dataPoints, retrievabilityData]);

    return (
      <BaseChart
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        contentHeight={GRAPH_HEIGHT_LARGE + 32}
        emptyStateText={EMPTY_STATE_MESSAGES.retrievability}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
            >
              {/* Subtle grid lines for better visual structure */}
              <ChartGrid width={graphWidth} height={GRAPH_HEIGHT_LARGE} gridLines={4} />

              {/* Area fill under the retrievability line - rendered first as base */}
              <Group>
                {chartData.retrievabilityPath && (
                  <Path
                    path={createAreaFillPath(
                      chartData.retrievabilityPath,
                      graphWidth,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('retrievability')}
                      positions={[0, 0.3, 0.7, 1]}
                    />
                  </Path>
                )}
              </Group>

              {/* Performance zones background - masked to only show below the data line */}
              <Group>
                {chartData.retrievabilityPath && (
                  <Mask
                    mask={
                      <Path
                        path={createAreaFillPath(
                          chartData.retrievabilityPath,
                          graphWidth,
                          GRAPH_HEIGHT_LARGE
                        )}
                        color={colors.white}
                      />
                    }
                  >
                    {chartData.dangerZones.map(zone => (
                      <Rect
                        key={`performance-zone-${zone.color}-${zone.y}`}
                        x={0}
                        y={zone.y}
                        width={graphWidth}
                        height={zone.height}
                        color={chartColors.withOpacity(zone.color, 0.25)}
                      />
                    ))}
                  </Mask>
                )}
              </Group>

              {/* Main retrievability line with brand accent color */}
              <Group>
                <Path
                  path={chartData.retrievabilityPath}
                  style="stroke"
                  strokeWidth={CHART_VISUAL.LINE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                  color={chartColors.ui.accent}
                />

                {/* Data points with enhanced styling */}
                {chartData.dataPoints.map((point, index) => {
                  const data = retrievabilityData[index];
                  if (!data || data.wordCount === 0) return null;

                  return (
                    <Group key={`retrievability-point-${data.date.toISOString()}`}>
                      {/* Enhanced data point with border */}
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={CHART_VISUAL.DATA_POINT_SIZE}
                        color={chartColors.ui.accent}
                      />
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
                        color={chartColors.ui.background}
                      />
                    </Group>
                  );
                })}
              </Group>
            </ChartCanvas>
          </View>

          {/* Enhanced axis labels with proper padding and y-axis values */}
          <ChartAxes
            width={graphWidth}
            height={GRAPH_HEIGHT_LARGE}
            xLabels={retrievabilityData
              .filter(data => data && data.wordCount > 0)
              .map(data => data.date.toLocaleDateString('en-US', { weekday: 'short' }))}
            xLabelPositions={chartData.dataPoints.map(point => point.x)}
            yMax={100}
            showYAxis={true}
            topPadding={0}
          />
        </View>
      </BaseChart>
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';

// Styles removed - now using ChartAxes component
