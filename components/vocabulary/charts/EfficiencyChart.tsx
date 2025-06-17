import {
  Path,
  Circle,
  Group,
  Skia,
  Rect,
  LinearGradient,
  vec,
  Mask,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
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
import { STRINGS } from '@/constants/strings';
import { useGraphWidth, GRAPH_HEIGHT_LARGE, DAYS_7, CHART_VISUAL } from '@/components/vocabulary/shared/constants';
import { TREND_CHANGE_THRESHOLD } from '@/constants/fsrs';
import {
  generateDateRange,
  isSameDay,
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  createAreaFillPath,
} from '@/components/vocabulary/shared/utils';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

interface EfficiencyRecord {
  date: Date;
  averageEfficiency: number;
  wordCount: number;
}

export const EfficiencyChart = memo(
  ({ studyWords = [], onInfoPress, hideTitle = false }: EfficiencyChartProps) => {
    const chartColors = useChartColors();
    const colors = useColors();
    const graphWidth = useGraphWidth();

    // Calculate efficiency data over the last 7 days
    const efficiencyData = useMemo<EfficiencyRecord[]>(() => {
      const dates = generateDateRange(DAYS_7);

      return dates.map(date => {
        let totalEfficiency = 0;
        let wordCount = 0;

        studyWords.forEach(word => {
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          // Count words reviewed on this specific day
          if (lastReview && isSameDay(lastReview, date) && (word.fsrs_reps ?? 0) > 0) {
            const efficiency = calculateEfficiencyScore(word);
            totalEfficiency += efficiency;
            wordCount++;
          }
        });

        const averageEfficiency = wordCount > 0 ? totalEfficiency / wordCount : 0;
        return { date, averageEfficiency, wordCount };
      });
    }, [studyWords]);

    // Calculate chart data and insights
    const chartData = useMemo(() => {
      if (efficiencyData.length === 0) {
        return {
          efficiencyPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
          performanceZones: [],
          dataPoints: [],
        };
      }

      const hasData = efficiencyData.some(d => d.wordCount > 0);

      if (!hasData) {
        return {
          efficiencyPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
          performanceZones: [],
          dataPoints: [],
        };
      }

      const maxEfficiency = Math.max(
        100,
        Math.max(...efficiencyData.map(d => d.averageEfficiency))
      );
      const stepX = graphWidth / (efficiencyData.length - 1);

      // Create smooth curve using Skia Path
      const path = Skia.Path.Make();
      const points: { x: number; y: number; efficiency: number; date: Date }[] = [];

      efficiencyData.forEach((data, index) => {
        const x = index * stepX;
        const y =
          GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE;
        points.push({ x, y, efficiency: data.averageEfficiency, date: data.date });

        if (index === 0) {
          path.moveTo(x, y);
        } else {
          // Create smooth curves using quadratic bezier
          const prevPoint = points[index - 1];
          if (prevPoint) {
            const controlX = (prevPoint.x + x) / 2;
            path.quadTo(controlX, prevPoint.y, x, y);
          }
        }
      });

      // Define performance zones using standardized utility
      const performanceZones = createStandardizedPerformanceZones(
        GRAPH_HEIGHT_LARGE,
        0,
        chartColors
      ).map(zone => ({
        ...zone,
        // Adjust for efficiency chart scaling
        y:
          GRAPH_HEIGHT_LARGE -
          ((zone.min + (zone.max - zone.min)) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: ((zone.max - zone.min) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      }));

      // Calculate insights
      const recent = efficiencyData.slice(-4); // Last 4 days for 7-day period
      const older = efficiencyData.slice(-7, -4); // Previous 3 days for comparison

      const currentEfficiency = recent[recent.length - 1]?.averageEfficiency || 0;
      const recentAvg =
        recent.length > 0
          ? recent.reduce((sum, day) => sum + day.averageEfficiency, 0) / recent.length
          : 0;
      const olderAvg =
        older.length > 0
          ? older.reduce((sum, day) => sum + day.averageEfficiency, 0) / older.length
          : 0;

      const change = recentAvg - olderAvg;
      const trend =
        change > TREND_CHANGE_THRESHOLD
          ? 'improving'
          : change < -TREND_CHANGE_THRESHOLD
          ? 'declining'
          : 'stable';

      return {
        efficiencyPath: path.toSVGString(),
        hasData,
        performanceZones,
        dataPoints: points,
        insights: {
          currentEfficiency: Math.round(currentEfficiency),
          trend,
          weeklyAverage: Math.round(recentAvg),
        },
      };
    }, [efficiencyData, chartColors]);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentEfficiency, weeklyAverage } = chartData.insights;

      if (currentEfficiency === 0) {
        return STRINGS.PRACTICE_TO_TRACK_LEARNING_SPEED;
      }

      // Use standardized subtitle generator
      return generateChartSubtitle.efficiency(currentEfficiency, weeklyAverage);
    }, [chartData.insights]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<EfficiencyRecord>[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = efficiencyData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.efficiency)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data: data,
        } as DataPoint<EfficiencyRecord>;
      })
        .filter((point): point is DataPoint<EfficiencyRecord> => point !== null);
    }, [chartData.dataPoints, efficiencyData]);

    return (
      <BaseChart
        contentHeight={GRAPH_HEIGHT_LARGE + 32}
        emptyStateText={EMPTY_STATE_MESSAGES.efficiency}
        hasData={chartData.hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={CHART_LABELS.SPEED}
        onInfoPress={onInfoPress}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
            >
              {/* Subtle grid lines for better visual structure */}
              <ChartGrid gridLines={4} height={GRAPH_HEIGHT_LARGE} width={graphWidth} />

              {/* Area fill under the efficiency line with gradient - rendered first as base */}
              <Group>
                {chartData.efficiencyPath && (
                  <Path
                    path={createAreaFillPath(
                      chartData.efficiencyPath,
                      graphWidth,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      colors={chartColors.getAreaFillGradient('efficiency')}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      positions={[0, 0.3, 0.7, 1]}
                      start={vec(0, 0)}
                    />
                  </Path>
                )}
              </Group>

              {/* Performance zones background - masked to only show below the data line */}
              <Group>
                {chartData.efficiencyPath && (
                  <Mask
                    mask={
                      <Path
                        color={colors.white}
                        path={createAreaFillPath(
                          chartData.efficiencyPath,
                          graphWidth,
                          GRAPH_HEIGHT_LARGE
                        )}
                      />
                    }
                  >
                    {chartData.performanceZones.map(zone => (
                      <Rect
                        key={`performance-zone-${zone.color}-${zone.y}`}
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

              {/* Efficiency line with brand accent color */}
              <Group>
                <Path
                  color={chartColors.ui.accent}
                  path={chartData.efficiencyPath}
                  strokeCap="round"
                  strokeJoin="round"
                  strokeWidth={CHART_VISUAL.LINE_WIDTH}
                  style="stroke"
                />

                {/* Data points with enhanced styling */}
                {chartData.dataPoints.map((point, index) => {
                  const data = efficiencyData[index];
                  if (!data || data.wordCount === 0) return null;

                  return (
                    <Group key={`efficiency-point-${data.date.toISOString()}`}>
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
                  );
                })}
              </Group>
            </ChartCanvas>
          </View>

          {/* Enhanced axis labels with proper padding and y-axis values */}
          <ChartAxes
            height={GRAPH_HEIGHT_LARGE}
            showYAxis={true}
            topPadding={0}
            width={graphWidth}
            xLabelPositions={chartData.dataPoints.map(point => point.x)}
            yMax={100}
            xLabels={efficiencyData.map(data =>
              data.date.toLocaleDateString('en-US', { weekday: 'short' })
            )}
          />
        </View>
      </BaseChart>
    );
  }
);

EfficiencyChart.displayName = 'EfficiencyChart';

// Styles removed - now using ChartAxes component
