import { Group } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseChart } from '@/components/vocabulary/shared/BaseChart';
import { ChartAreaFill } from '@/components/vocabulary/shared/ChartAreaFill';
import { ChartAxes, Y_AXIS_WIDTH } from '@/components/vocabulary/shared/ChartAxes';
import { ChartCanvas, type DataPoint } from '@/components/vocabulary/shared/ChartCanvas';
import { ChartDataPoint } from '@/components/vocabulary/shared/ChartDataPoint';
import { ChartGrid } from '@/components/vocabulary/shared/ChartGrid';
import { ChartMainLine } from '@/components/vocabulary/shared/ChartMainLine';
import { ChartPerformanceZones } from '@/components/vocabulary/shared/ChartPerformanceZones';
import { GRAPH_HEIGHT_LARGE } from '@/components/vocabulary/shared/constants';

// Extract constants outside component for better performance
const DEFAULT_Y_MAX = 100;
const DEFAULT_TOP_PADDING = 0;
const CONTENT_HEIGHT_OFFSET = 32;

interface ChartPoint {
  x: number;
  y: number;
  date: Date;
  rate?: number; // For milestones
}

interface PerformanceZone {
  color: string;
  y: number;
  height: number;
}

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

// Custom comparison function for memoization
const VocabularyChartComparison = <T,>(
  prevProps: VocabularyChartProps<T>,
  nextProps: VocabularyChartProps<T>
): boolean => {
  // Quick path comparisons first
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
    prevProps.onCardPress !== nextProps.onCardPress
  ) {
    return false;
  }

  // Array comparisons with length checks first
  if (
    prevProps.dataPoints.length !== nextProps.dataPoints.length ||
    prevProps.performanceZones?.length !== nextProps.performanceZones?.length ||
    prevProps.milestones?.length !== nextProps.milestones?.length ||
    prevProps.tooltipDataPoints.length !== nextProps.tooltipDataPoints.length ||
    prevProps.xLabels.length !== nextProps.xLabels.length ||
    prevProps.xLabelPositions.length !== nextProps.xLabelPositions.length
  ) {
    return false;
  }

  // Deep comparison for data points (most expensive - do last)
  for (let i = 0; i < prevProps.dataPoints.length; i++) {
    const prev = prevProps.dataPoints[i];
    const next = nextProps.dataPoints[i];
    if (
      !prev ||
      !next ||
      prev.x !== next.x ||
      prev.y !== next.y ||
      prev.date.getTime() !== next.date.getTime()
    ) {
      return false;
    }
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
 * Simplified and optimized with:
 * - React.memo with custom comparison function
 * - Static style objects
 * - Direct prop passing without excessive memoization
 * - Optimized Skia rendering
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
    const contentHeight = GRAPH_HEIGHT_LARGE + CONTENT_HEIGHT_OFFSET;
    const hasChartData = path && dataPoints.length > 0;
    const hasPerformanceZones = hasChartData && performanceZones.length > 0;
    const hasMilestones = milestones.length > 0;

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
            <ChartCanvas dataPoints={tooltipDataPoints}>
              {/* Grid lines */}
              <ChartGrid
                height={GRAPH_HEIGHT_LARGE}
                topPadding={topPadding}
                width={graphWidth}
                xLabelPositions={xLabelPositions}
                yMax={yMax}
              />

              {/* Area fill under the line */}
              {hasChartData && (
                <Group>
                  <ChartAreaFill path={path} graphWidth={graphWidth} topPadding={topPadding} />
                </Group>
              )}

              {/* Performance zones */}
              {hasPerformanceZones && (
                <Group>
                  <ChartPerformanceZones
                    zones={performanceZones}
                    maskPath={path}
                    graphWidth={graphWidth}
                  />
                </Group>
              )}

              {/* Main line and data points */}
              {hasChartData && (
                <Group>
                  <ChartMainLine path={path} />
                  {dataPoints.map((point: ChartPoint) => (
                    <ChartDataPoint
                      key={`data-point-${point.date.toISOString()}`}
                      x={point.x}
                      y={point.y}
                      uniqueKey={`data-point-${point.date.toISOString()}`}
                    />
                  ))}
                </Group>
              )}

              {/* Milestone indicators */}
              {hasMilestones && (
                <Group>
                  {milestones.map((milestone: ChartPoint, index: number) => {
                    const keyIdentifier = 'rate' in milestone ? milestone.rate : index;
                    return (
                      <ChartDataPoint
                        key={`milestone-${milestone.date.toISOString()}-${keyIdentifier}`}
                        x={milestone.x}
                        y={milestone.y}
                        uniqueKey={`milestone-${milestone.date.toISOString()}-${keyIdentifier}`}
                      />
                    );
                  })}
                </Group>
              )}
            </ChartCanvas>
          </View>

          {/* Axes */}
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
        </View>
      </BaseChart>
    );
  },
  VocabularyChartComparison
);

VocabularyChart.displayName = 'VocabularyChart';
