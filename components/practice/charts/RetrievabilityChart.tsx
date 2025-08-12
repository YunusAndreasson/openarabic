import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import {
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
  generateChartSubtitle,
} from '@/components/common/charts/chartMessages';
import { calculateDataPointPositions, useGraphWidth } from '@/components/common/charts/constants';
import { STRINGS } from '@/constants/strings';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

interface RetrievabilityRecord {
  date: Date;
  averageRetrievability: number;
  wordCount: number;
  criticalWords: number;
  urgentWords: number;
}

export const RetrievabilityChart = memo<RetrievabilityChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = false }: RetrievabilityChartProps) => {
    const graphWidth = useGraphWidth();
    const { retrievabilityData, chartData } = useRetrievabilityChart(studyWords);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return STRINGS.STUDY_WORDS_TO_TRACK_MEMORY_RETENTION;
      }

      return generateChartSubtitle.retrievability(currentRetrievability, criticalWords, totalWords);
    }, [chartData.insights, studyWords.length]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<RetrievabilityRecord>[] = useMemo(() => {
      // chartData.dataPoints only contains days with data, so we map directly
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${Math.round(point.retrievability)}%`,
        label: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        data: {
          date: point.date,
          averageRetrievability: point.retrievability,
          wordCount: 1, // Days with data always have wordCount > 0
          criticalWords: 0, // Simplified for tooltip
          urgentWords: 0, // Simplified for tooltip
        },
      }));
    }, [chartData.dataPoints]);

    // Stabilize x labels and positions to maximize memoization effectiveness
    const xLabels = useMemo(
      () =>
        retrievabilityData.map(data =>
          data.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
        ),
      [retrievabilityData]
    );

    const xLabelPositions = useMemo(() => {
      const allDayPositions = calculateDataPointPositions(retrievabilityData.length);
      return retrievabilityData.map((_, index) => allDayPositions[index] || 0);
    }, [retrievabilityData.length]);

    // 🚀 Unified chart with perfect grid system and danger zones:
    return (
      <VocabularyChart
        path={chartData.retrievabilityPath}
        dataPoints={chartData.dataPoints}
        performanceZones={chartData.dangerZones} // Danger zones for retrievability
        tooltipDataPoints={dataPoints}
        xLabels={xLabels} // Show all 7 days including days with no data
        xLabelPositions={xLabelPositions}
        yMax={100}
        topPadding={0}
        graphWidth={graphWidth}
        todayIndex={0} // Today is leftmost for future predictions
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.retrievability}
        bottomSummary={
          chartData.hasData
            ? [
                { label: STRINGS.LATEST, value: `${chartData.insights.currentRetrievability}%` },
                {
                  label: STRINGS.AVERAGE,
                  value: `${Math.round(
                    chartData.dataPoints.length > 0
                      ? chartData.dataPoints.reduce((s, p) => s + p.retrievability, 0) /
                          chartData.dataPoints.length
                      : 0
                  )}%`,
                },
                {
                  label: STRINGS.MAX,
                  value: `${Math.round(
                    Math.max(0, ...chartData.dataPoints.map(p => p.retrievability))
                  )}%`,
                },
              ]
            : []
        }
      />
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';
