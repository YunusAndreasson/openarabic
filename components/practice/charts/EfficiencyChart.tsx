import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import {
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
  generateChartSubtitle,
} from '@/components/common/charts/chartMessages';
import { calculateDataPointPositions, useGraphWidth } from '@/components/common/charts/constants';
import { STRINGS } from '@/constants/strings';
import { useEfficiencyChart, type EfficiencyRecord } from '@/hooks/vocabulary/useEfficiencyChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

export const EfficiencyChart = memo<EfficiencyChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = false }: EfficiencyChartProps) => {
    const graphWidth = useGraphWidth();
    const { efficiencyData, chartData } = useEfficiencyChart(studyWords);

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
      // chartData.dataPoints only contains days with data, so we map directly
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${Math.round(point.efficiency)}%`,
        label: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        data: {
          date: point.date,
          averageEfficiency: point.efficiency,
          wordCount: 1, // Days with data always have wordCount > 0
        },
      }));
    }, [chartData.dataPoints]);

    // Stabilize x labels and positions to maximize memoization effectiveness
    const xLabels = useMemo(
      () => efficiencyData.map(data => data.date.toLocaleDateString('en-US', { weekday: 'short' })),
      [efficiencyData]
    );

    const xLabelPositions = useMemo(() => {
      const allDayPositions = calculateDataPointPositions(efficiencyData.length);
      return efficiencyData.map((_, index) => allDayPositions[index] || 0);
    }, [efficiencyData.length]);

    // 🚀 Unified chart with perfect grid system and performance zones:
    return (
      <VocabularyChart
        path={chartData.efficiencyPath}
        dataPoints={chartData.dataPoints}
        performanceZones={chartData.performanceZones}
        tooltipDataPoints={dataPoints}
        xLabels={xLabels}
        xLabelPositions={xLabelPositions}
        yMax={100}
        topPadding={0}
        graphWidth={graphWidth}
        title={CHART_LABELS.SPEED}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.efficiency}
      />
    );
  }
);

EfficiencyChart.displayName = 'EfficiencyChart';
