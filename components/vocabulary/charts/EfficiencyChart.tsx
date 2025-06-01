import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Group,
  Skia,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

import type { StudyWord } from '@/types/vocabulary.types';
import {
  generateDateRange,
  isSameDay,
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { ChartTooltip, DataPointOverlay, useChartTooltip } from '../shared/ChartInteractivity';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_14, CHART_LAYOUT } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

export const EfficiencyChart = memo(
  ({ studyWords = [], onInfoPress, hideTitle = false }: EfficiencyChartProps) => {
    const chartColors = useChartColors();
    const { tooltip, showTooltip } = useChartTooltip();

    // Calculate efficiency data over the last 14 days
    const efficiencyData = useMemo(() => {
      const dates = generateDateRange(DAYS_14);

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
          smoothPath: '',
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
          smoothPath: '',
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
      const stepX = GRAPH_WIDTH / (efficiencyData.length - 1);

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
          const controlX = (prevPoint!.x + x) / 2;
          path.quadTo(controlX, prevPoint!.y, x, y);
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
      const recent = efficiencyData.slice(-7).filter(d => d.wordCount > 0);
      const older = efficiencyData.slice(-14, -7).filter(d => d.wordCount > 0);

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
      const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';

      return {
        efficiencyPath: path.toSVGString(),
        smoothPath: path.toSVGString(),
        hasData,
        maxEfficiency,
        performanceZones,
        dataPoints: points,
        insights: {
          currentEfficiency: Math.round(currentEfficiency * 10) / 10,
          trend,
          weeklyAverage: Math.round(recentAvg * 10) / 10,
        },
      };
    }, [efficiencyData, chartColors]);

    // Generate subtitle using shared utility
    const subtitle = useMemo(() => {
      const { currentEfficiency, trend } = chartData.insights;
      return generatePerformanceSubtitle(
        currentEfficiency,
        'learning efficiency',
        trend as 'improving' | 'declining' | 'stable'
      );
    }, [chartData.insights]);

    if (!chartData.hasData) {
      return (
        <BaseCard shadowSize="small" includePressAnimation={false}>
          <View style={styles.efficiencyContent}>
            {!hideTitle && (
              <CardHeader
                title="Learning Speed"
                subtitle="Study words to track your progress"
                onInfoPress={onInfoPress}
              />
            )}
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard shadowSize="small" includePressAnimation={false}>
        <View style={styles.efficiencyContent}>
          {!hideTitle && (
            <CardHeader title="Learning Speed" subtitle={subtitle} onInfoPress={onInfoPress} />
          )}

          <StatsRow
            leftStat={{
              value: `${chartData.insights.currentEfficiency}%`,
              label: 'speed',
              color: chartColors.getPerformanceColor(chartData.insights.currentEfficiency),
            }}
            rightStat={{
              value: `${chartData.insights.weeklyAverage}%`,
              label: 'average',
              color: chartColors.getPerformanceColor(chartData.insights.weeklyAverage),
            }}
          />

          {/* Enhanced Efficiency Chart */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
              {/* Performance zones background */}
              <Group>
                {chartData.performanceZones.map((zone, index) => (
                  <Rect
                    key={`performance-zone-${index}`}
                    x={0}
                    y={zone.y}
                    width={GRAPH_WIDTH}
                    height={zone.height}
                    color={chartColors.withOpacity(zone.color, 0.1)}
                  />
                ))}
              </Group>

              {/* Area fill under the efficiency line with gradient */}
              <Group>
                {chartData.efficiencyPath && (
                  <Path
                    path={createAreaFillPath(
                      chartData.efficiencyPath,
                      GRAPH_WIDTH,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('efficiency')}
                      positions={[0, 0.3, 0.7, 1]}
                    />
                  </Path>
                )}
              </Group>

              {/* Efficiency line */}
              <Group>
                <Path
                  path={chartData.efficiencyPath}
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                  strokeJoin="round"
                  color={chartColors.ui.dataLine}
                />

                {/* Data points with enhanced styling */}
                {chartData.dataPoints.map((point, index) => {
                  const data = efficiencyData[index];
                  if (!data || data.wordCount === 0) return null;

                  return (
                    <Group key={`efficiency-point-${index}`}>
                      {/* Subtle glow ring */}
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={6}
                        color={chartColors.getDataPointGlow('efficiency')}
                      />
                      {/* Main data point */}
                      <Circle cx={point.x} cy={point.y} r={4} color={chartColors.ui.dataLine} />
                    </Group>
                  );
                })}
              </Group>
            </Canvas>

            {/* Interactive data point overlays */}
            {chartData.dataPoints.map((point, index) => {
              const data = efficiencyData[index];
              if (!data || data.wordCount === 0) return null;

              return (
                <DataPointOverlay
                  key={`data-point-${index}`}
                  x={point.x}
                  y={point.y}
                  value={`${Math.round(point.efficiency * 10) / 10}%`}
                  label={data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  onPress={showTooltip}
                  accessibilityLabel={`Data point: ${Math.round(point.efficiency * 10) / 10}% efficiency on ${data.date.toLocaleDateString()}`}
                />
              );
            })}

            {/* Reusable tooltip component */}
            <ChartTooltip tooltip={tooltip} maxWidth={GRAPH_WIDTH} />
          </View>

          <ChartFooter
            legendItems={[
              {
                type: 'line',
                color: chartColors.ui.dataLine,
                label: 'Efficiency',
              },
            ]}
            timeRange="Past 14 days"
          />
        </View>
      </BaseCard>
    );
  }
);

EfficiencyChart.displayName = 'EfficiencyChart';

const styles = StyleSheet.create({
  efficiencyContent: {
    padding: CHART_LAYOUT.CONTENT_PADDING,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
    marginHorizontal: CHART_LAYOUT.GRAPH_MARGIN_HORIZONTAL,
    paddingVertical: CHART_LAYOUT.GRAPH_MARGIN_VERTICAL,
  },
});
