import { Group } from '@shopify/react-native-skia';
import { memo } from 'react';
import { View } from 'react-native';

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

/**
 * Unified vocabulary chart component that eliminates duplication
 * across MasteryChart, EfficiencyChart, and RetrievabilityChart
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
    yMax = 100,
    topPadding = 0,
    graphWidth,
    title,
    subtitle,
    onInfoPress,
    hideTitle = false,
    hasData,
    emptyStateText,
  }) => {
    return (
      <BaseChart
        contentHeight={GRAPH_HEIGHT_LARGE + 32}
        emptyStateText={emptyStateText}
        hasData={hasData}
        hideTitle={hideTitle}
        subtitle={subtitle}
        title={title}
        onInfoPress={onInfoPress}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas dataPoints={tooltipDataPoints} enableTooltips={true}>
              {/* Grid lines */}
              <ChartGrid
                height={GRAPH_HEIGHT_LARGE}
                topPadding={topPadding}
                width={graphWidth}
                xLabelPositions={xLabelPositions}
                yMax={yMax}
              />

              {/* Area fill under the line */}
              <Group>
                {path && dataPoints.length > 0 && (
                  <ChartAreaFill path={path} graphWidth={graphWidth} topPadding={topPadding} />
                )}
              </Group>

              {/* Performance zones */}
              <Group>
                {path && dataPoints.length > 0 && performanceZones.length > 0 && (
                  <ChartPerformanceZones
                    zones={performanceZones}
                    maskPath={path}
                    graphWidth={graphWidth}
                  />
                )}
              </Group>

              {/* Main line */}
              <Group>
                {path && dataPoints.length > 0 && <ChartMainLine path={path} />}

                {/* Data points */}
                {dataPoints.map(point => (
                  <ChartDataPoint
                    key={`data-point-${point.date.toISOString()}`}
                    x={point.x}
                    y={point.y}
                    uniqueKey={`data-point-${point.date.toISOString()}`}
                  />
                ))}
              </Group>

              {/* Milestone indicators (for mastery chart) */}
              {milestones.length > 0 && (
                <Group>
                  {milestones.map((milestone, index) => {
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
          />
        </View>
      </BaseChart>
    );
  }
);

VocabularyChart.displayName = 'VocabularyChart';
