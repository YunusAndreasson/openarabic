import { CHART_VISUAL, GRAPH_HEIGHT_LARGE } from '@/constants/chartConstants';
import { getChartColors } from '@/constants/chartColors';

import { BaseChart } from './BaseChart';
import { ChartAreaFill } from './ChartAreaFill';
import { ChartAxes, Y_AXIS_WIDTH } from './ChartAxes';
import { ChartCanvas, type DataPoint } from './ChartCanvas';
import { ChartDataPoint } from './ChartDataPoint';
import { ChartGrid } from './ChartGrid';
import { ChartMainLine } from './ChartMainLine';
import { Group } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import { generateDataPointKeys, type ChartPoint } from '@/utils/chartUtils';

// Extract constants outside component for better performance
const DEFAULT_Y_MAX = 100;
const DEFAULT_TOP_PADDING = 0;
const CONTENT_HEIGHT_OFFSET = 32;

interface VocabularyChartProps<T> {
  // Chart data
  path: string;
  dataPoints: ChartPoint[];

  // Tooltip data
  tooltipDataPoints: DataPoint<T>[];

  // Axis configuration
  xLabels: string[];
  xLabelPositions: number[];
  yMax?: number;
  topPadding?: number;
  graphWidth: number;
  yLabelFormatter?: (value: number) => string;
  isFuturePrediction?: boolean; // Whether this chart shows future predictions (today = index 0)

  // BaseChart props
  title: string;
  subtitle: string;
  hideTitle?: boolean;
  hasData: boolean;
  emptyStateText: string;
  bottomSummary?: { label: string; value: string }[];
}

// Optimized comparison function with shallow array checks and stable references
const VocabularyChartComparison = <T,>(
  prevProps: VocabularyChartProps<T>,
  nextProps: VocabularyChartProps<T>,
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
    prevProps.graphWidth !== nextProps.graphWidth
  ) {
    return false;
  }

  // Shallow array reference comparisons - much faster than deep comparisons
  if (
    prevProps.dataPoints !== nextProps.dataPoints ||
    prevProps.tooltipDataPoints !== nextProps.tooltipDataPoints ||
    prevProps.xLabels !== nextProps.xLabels ||
    prevProps.xLabelPositions !== nextProps.xLabelPositions ||
    // Every remaining prop, because a hand-written comparator that omits one
    // does not merely miss an optimisation — it silently refuses the update.
    // `bottomSummary` is the live case: its useMemo tracks the insights, so a
    // changed "Today: N" would have been held back on any render where the
    // path and the tooltip points happened to keep their references.
    prevProps.bottomSummary !== nextProps.bottomSummary ||
    prevProps.isFuturePrediction !== nextProps.isFuturePrediction ||
    prevProps.yLabelFormatter !== nextProps.yLabelFormatter
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
 * A line chart over a short forecast window: grid, area fill, smoothed line,
 * emphasised "today" point, axes, and an interactive tooltip layer.
 *
 * It once carried optional coloured performance zones, milestone markers, a
 * reference line and an area-fill switch, for the three charts it was extracted
 * from. Those charts are gone — `DueWordsPrognosisChart` is the only caller
 * left, and it passed none of them, so every one of those branches was dead
 * weight that still had to be read to understand the render path.
 */
export const VocabularyChart = memo<VocabularyChartProps<unknown>>(
  ({
    path,
    dataPoints,
    tooltipDataPoints,
    xLabels,
    xLabelPositions,
    yMax = DEFAULT_Y_MAX,
    topPadding = DEFAULT_TOP_PADDING,
    graphWidth,
    yLabelFormatter,
    isFuturePrediction = false,
    title,
    subtitle,
    hideTitle = false,
    hasData,
    emptyStateText,
    bottomSummary,
  }: VocabularyChartProps<unknown>) => {
    // Get colors outside Canvas (Context available here)
    const colors = useColors();
    const chartColors = useMemo(() => getChartColors(colors), [colors]);

    // Emphasized point: today — index 0 on forecasts, last index on history
    const emphasisIndex = isFuturePrediction ? 0 : dataPoints.length - 1;

    const contentHeight = GRAPH_HEIGHT_LARGE + CHART_VISUAL.CHART_BOTTOM_PADDING;

    const hasChartData = Boolean(path) && dataPoints.length > 0;

    // Memoized data point keys for stable rendering
    const dataPointKeys = useMemo(() => generateDataPointKeys(dataPoints), [dataPoints]);

    // Memoized chart components for better Skia rendering performance
    const chartComponents = useMemo(() => {
      const components = [];

      // Grid lines
      components.push(
        <ChartGrid
          key="chart-grid"
          height={contentHeight}
          topPadding={topPadding}
          width={graphWidth}
          yMax={yMax}
          chartColors={chartColors}
        />,
      );

      // Area fill under the line - extends to full chart width
      if (hasChartData) {
        components.push(
          <Group key="area-fill">
            <ChartAreaFill path={path} graphWidth={graphWidth} chartColors={chartColors} />
          </Group>,
        );
      }

      // Main line and data points
      if (hasChartData) {
        components.push(
          <Group key="main-line-data-points">
            <ChartMainLine path={path} chartColors={chartColors} />
            {dataPoints.map((point: ChartPoint, index: number) => (
              <ChartDataPoint
                key={dataPointKeys[index]}
                x={point.x}
                y={point.y}
                uniqueKey={dataPointKeys[index]}
                chartColors={chartColors}
                index={index}
                emphasis={index === emphasisIndex}
              />
            ))}
          </Group>,
        );
      }

      return components;
    }, [
      hasChartData,
      path,
      graphWidth,
      topPadding,
      yMax,
      contentHeight,
      dataPoints,
      dataPointKeys,
      chartColors,
      emphasisIndex,
    ]);

    // Memoized axes component
    const axesComponent = useMemo(
      () => (
        <ChartAxes
          height={contentHeight}
          showYAxis={true}
          topPadding={topPadding}
          width={graphWidth}
          xLabelPositions={xLabelPositions}
          yMax={yMax}
          xLabels={xLabels}
          yLabelFormatter={yLabelFormatter}
          isFuturePrediction={isFuturePrediction}
        />
      ),
      [
        contentHeight,
        topPadding,
        graphWidth,
        xLabelPositions,
        yMax,
        xLabels,
        yLabelFormatter,
        isFuturePrediction,
      ],
    );

    return (
      <BaseChart
        contentHeight={contentHeight + CONTENT_HEIGHT_OFFSET}
        emptyStateText={emptyStateText}
        hasData={hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={title}
        bottomSummary={bottomSummary}
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
  VocabularyChartComparison,
);

VocabularyChart.displayName = 'VocabularyChart';
