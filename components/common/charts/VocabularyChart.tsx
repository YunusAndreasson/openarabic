import { Group } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseChart } from '@charts/BaseChart';
import { ChartAreaFill } from '@charts/ChartAreaFill';
import { ChartAxes, Y_AXIS_WIDTH } from '@charts/ChartAxes';
import { ChartCanvas, type DataPoint } from '@charts/ChartCanvas';
import { ChartDataPoint } from '@charts/ChartDataPoint';
import { ChartGrid } from '@charts/ChartGrid';
import { ChartMainLine } from '@charts/ChartMainLine';
import { ChartPerformanceZones } from '@charts/ChartPerformanceZones';
import { GRAPH_HEIGHT_LARGE } from '@charts/constants';

import type { PerformanceZone } from '@/types/ui/chart.types';
import { generateDataPointKeys, generateMilestoneKeys, type ChartPoint } from '@/utils/chartUtils';

// Extract constants outside component for better performance
const DEFAULT_Y_MAX = 100;
const DEFAULT_TOP_PADDING = 0;
const CONTENT_HEIGHT_OFFSET = 32;

interface VocabularyChartProps<T> {
  // Chart data
  path: string;
  dataPoints: ChartPoint[];
  performanceZones?: PerformanceZone[];
  milestones?: ChartPoint[];

  // Tooltip data
  tooltipDataPoints: DataPoint<T>[];

  // Axis configuration
  xLabels: string[];
  xLabelPositions: number[];
  yMax?: number;
  topPadding?: number;
  graphWidth: number;
  todayIndex?: number; // Index of the label that represents "today"

  // BaseChart props
  title: string;
  subtitle: string;
  onCardPress?: () => void;
  hideTitle?: boolean;
  hasData: boolean;
  emptyStateText: string;
}

// Optimized comparison function with shallow array checks and stable references
const VocabularyChartComparison = <T,>(
  prevProps: VocabularyChartProps<T>,
  nextProps: VocabularyChartProps<T>
): boolean => {
  // Quick primitive comparisons first
  if (
    prevProps.path !== nextProps.path ||
    prevProps.hasData !== nextProps.hasData ||
    prevProps.hideTitle !== nextProps.hideTitle ||
    prevProps.title !== nextProps.title ||
    prevProps.subtitle !== nextProps.subtitle ||
    prevProps.emptyStateText !== nextProps.emptyStateText ||
    prevProps.yMax !== nextProps.yMax ||
    prevProps.topPadding !== nextProps.topPadding ||
    prevProps.graphWidth !== nextProps.graphWidth ||
    prevProps.onCardPress !== nextProps.onCardPress ||
    prevProps.todayIndex !== nextProps.todayIndex
  ) {
    return false;
  }

  // Shallow array reference comparisons - much faster than deep comparisons
  if (
    prevProps.dataPoints !== nextProps.dataPoints ||
    prevProps.performanceZones !== nextProps.performanceZones ||
    prevProps.milestones !== nextProps.milestones ||
    prevProps.tooltipDataPoints !== nextProps.tooltipDataPoints ||
    prevProps.xLabels !== nextProps.xLabels ||
    prevProps.xLabelPositions !== nextProps.xLabelPositions
  ) {
    return false;
  }

  return true;
};

// Static styles object to prevent recreation
const styles = StyleSheet.create({
  container: {
    position: 'relative' as const,
  },
  chartContainer: {
    marginLeft: Y_AXIS_WIDTH,
  },
});

/**
 * Unified vocabulary chart component that eliminates duplication
 * across MasteryChart, EfficiencyChart, and RetrievabilityChart
 *
 * Optimized with:
 * - React.memo with shallow comparison function
 * - Static style objects
 * - Memoized chart data calculations
 * - Optimized Skia rendering with stable references
 */
export const VocabularyChart = memo<VocabularyChartProps<any>>(
  ({
    path,
    dataPoints,
    performanceZones = [],
    milestones = [],
    tooltipDataPoints,
    xLabels,
    xLabelPositions,
    yMax = DEFAULT_Y_MAX,
    topPadding = DEFAULT_TOP_PADDING,
    graphWidth,
    todayIndex,
    title,
    subtitle,
    onCardPress,
    hideTitle = false,
    hasData,
    emptyStateText,
  }) => {
    // Memoized chart data calculations for better performance
    const contentHeight = useMemo(() => GRAPH_HEIGHT_LARGE + CONTENT_HEIGHT_OFFSET, []);

    const chartData = useMemo(
      () => ({
        hasChartData: path && dataPoints.length > 0,
        hasPerformanceZones: path && dataPoints.length > 0 && performanceZones.length > 0,
        hasMilestones: milestones.length > 0,
      }),
      [path, dataPoints.length, performanceZones.length, milestones.length]
    );

    // Memoized data point keys for stable rendering
    const dataPointKeys = useMemo(() => generateDataPointKeys(dataPoints), [dataPoints]);

    // Memoized milestone keys for stable rendering
    const milestoneKeys = useMemo(() => generateMilestoneKeys(milestones), [milestones]);

    // Memoized chart components for better Skia rendering performance
    const chartComponents = useMemo(() => {
      const components = [];

      // Grid lines
      components.push(
        <ChartGrid
          key="chart-grid"
          height={GRAPH_HEIGHT_LARGE}
          topPadding={topPadding}
          width={graphWidth}
          xLabelPositions={xLabelPositions}
          yMax={yMax}
        />
      );

      // Area fill under the line
      if (chartData.hasChartData) {
        components.push(
          <Group key="area-fill">
            <ChartAreaFill path={path} graphWidth={graphWidth} topPadding={topPadding} />
          </Group>
        );
      }

      // Performance zones
      if (chartData.hasPerformanceZones) {
        components.push(
          <Group key="performance-zones">
            <ChartPerformanceZones
              zones={performanceZones}
              maskPath={path}
              graphWidth={graphWidth}
            />
          </Group>
        );
      }

      // Main line and data points
      if (chartData.hasChartData) {
        components.push(
          <Group key="main-line-data-points">
            <ChartMainLine path={path} />
            {dataPoints.map((point: ChartPoint, index: number) => (
              <ChartDataPoint
                key={dataPointKeys[index]}
                x={point.x}
                y={point.y}
                uniqueKey={dataPointKeys[index]}
              />
            ))}
          </Group>
        );
      }

      // Milestone indicators
      if (chartData.hasMilestones) {
        components.push(
          <Group key="milestones">
            {milestones.map((milestone: ChartPoint, index: number) => (
              <ChartDataPoint
                key={milestoneKeys[index]}
                x={milestone.x}
                y={milestone.y}
                uniqueKey={milestoneKeys[index]}
              />
            ))}
          </Group>
        );
      }

      return components;
    }, [
      chartData,
      path,
      graphWidth,
      topPadding,
      xLabelPositions,
      yMax,
      performanceZones,
      dataPoints,
      dataPointKeys,
      milestones,
      milestoneKeys,
    ]);

    // Memoized axes component
    const axesComponent = useMemo(
      () => (
        <ChartAxes
          height={GRAPH_HEIGHT_LARGE}
          showYAxis={true}
          topPadding={topPadding}
          width={graphWidth}
          xLabelPositions={xLabelPositions}
          yMax={yMax}
          xLabels={xLabels}
          todayIndex={todayIndex}
        />
      ),
      [topPadding, graphWidth, xLabelPositions, yMax, xLabels, todayIndex]
    );

    return (
      <BaseChart
        contentHeight={contentHeight}
        emptyStateText={emptyStateText}
        hasData={hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={title}
        onCardPress={onCardPress}
      >
        <View style={styles.container}>
          <View style={styles.chartContainer}>
            <ChartCanvas dataPoints={tooltipDataPoints}>{chartComponents}</ChartCanvas>
          </View>

          {/* Axes */}
          {axesComponent}
        </View>
      </BaseChart>
    );
  },
  VocabularyChartComparison
);

VocabularyChart.displayName = 'VocabularyChart';
