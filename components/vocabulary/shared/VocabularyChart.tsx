import { Group } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BaseChart,
  ChartCanvas,
  ChartGrid,
  ChartAxes,
  Y_AXIS_WIDTH,
  ChartDataPoint,
  ChartAreaFill,
  ChartMainLine,
  ChartPerformanceZones,
  type DataPoint,
} from '@/components/vocabulary/shared';
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

interface VocabularyChartProps<T = any> {
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

  // BaseChart props
  title: string;
  subtitle: string;
  onInfoPress: () => void;
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
    prevProps.onInfoPress !== nextProps.onInfoPress
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
 * Performance optimized with:
 * - React.memo with custom comparison
 * - Memoized expensive computations
 * - Static style objects
 * - Optimized Skia rendering
 */
export const VocabularyChart = memo<VocabularyChartProps>(
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
    title,
    subtitle,
    onInfoPress,
    hideTitle = false,
    hasData,
    emptyStateText,
  }) => {
    // Memoize content height calculation
    const contentHeight = useMemo(() => GRAPH_HEIGHT_LARGE + CONTENT_HEIGHT_OFFSET, []);

    // Memoize data existence checks for performance
    const hasChartData = useMemo(() => path && dataPoints.length > 0, [path, dataPoints.length]);

    const hasPerformanceZones = useMemo(
      () => hasChartData && performanceZones.length > 0,
      [hasChartData, performanceZones.length]
    );

    const hasMilestones = useMemo(() => milestones.length > 0, [milestones.length]);

    // Memoize data point rendering for better performance
    const dataPointElements = useMemo(() => {
      return dataPoints.map(point => (
        <ChartDataPoint
          key={`data-point-${point.date.toISOString()}`}
          x={point.x}
          y={point.y}
          uniqueKey={`data-point-${point.date.toISOString()}`}
        />
      ));
    }, [dataPoints]);

    // Memoize milestone rendering
    const milestoneElements = useMemo(() => {
      return milestones.map((milestone, index) => {
        const keyIdentifier = 'rate' in milestone ? milestone.rate : index;
        return (
          <ChartDataPoint
            key={`milestone-${milestone.date.toISOString()}-${keyIdentifier}`}
            x={milestone.x}
            y={milestone.y}
            uniqueKey={`milestone-${milestone.date.toISOString()}-${keyIdentifier}`}
          />
        );
      });
    }, [milestones]);

    // Memoize ChartCanvas props to prevent unnecessary re-renders
    const chartCanvasProps = useMemo(
      () => ({
        dataPoints: tooltipDataPoints,
        enableTooltips: true,
      }),
      [tooltipDataPoints]
    );

    // Memoize ChartGrid props
    const chartGridProps = useMemo(
      () => ({
        height: GRAPH_HEIGHT_LARGE,
        topPadding,
        width: graphWidth,
        xLabelPositions,
        yMax,
      }),
      [topPadding, graphWidth, xLabelPositions, yMax]
    );

    // Memoize ChartAxes props
    const chartAxesProps = useMemo(
      () => ({
        height: GRAPH_HEIGHT_LARGE,
        showYAxis: true,
        topPadding,
        width: graphWidth,
        xLabelPositions,
        yMax,
        xLabels,
      }),
      [topPadding, graphWidth, xLabelPositions, yMax, xLabels]
    );

    // Memoize ChartAreaFill props
    const chartAreaFillProps = useMemo(
      () => ({
        path,
        graphWidth,
        topPadding,
      }),
      [path, graphWidth, topPadding]
    );

    // Memoize ChartPerformanceZones props
    const chartPerformanceZonesProps = useMemo(
      () => ({
        zones: performanceZones,
        maskPath: path,
        graphWidth,
      }),
      [performanceZones, path, graphWidth]
    );

    return (
      <BaseChart
        contentHeight={contentHeight}
        emptyStateText={emptyStateText}
        hasData={hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={title}
        onInfoPress={onInfoPress}
      >
        <View style={styles.container}>
          <View style={styles.chartContainer}>
            <ChartCanvas {...chartCanvasProps}>
              {/* Grid lines */}
              <ChartGrid {...chartGridProps} />

              {/* Area fill under the line */}
              {hasChartData && (
                <Group>
                  <ChartAreaFill {...chartAreaFillProps} />
                </Group>
              )}

              {/* Performance zones */}
              {hasPerformanceZones && (
                <Group>
                  <ChartPerformanceZones {...chartPerformanceZonesProps} />
                </Group>
              )}

              {/* Main line and data points */}
              {hasChartData && (
                <Group>
                  <ChartMainLine path={path} />
                  {dataPointElements}
                </Group>
              )}

              {/* Milestone indicators */}
              {hasMilestones && <Group>{milestoneElements}</Group>}
            </ChartCanvas>
          </View>

          {/* Axes */}
          <ChartAxes {...chartAxesProps} />
        </View>
      </BaseChart>
    );
  },
  VocabularyChartComparison
);

VocabularyChart.displayName = 'VocabularyChart';
