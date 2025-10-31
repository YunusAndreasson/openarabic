import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import { CHART_LABELS, generateChartSubtitle } from '@/components/common/charts/ChartMessages';
import { calculateDataPointPositions, useGraphWidth } from '@/components/common/charts/constants';
import { formatMonthDayUTC, formatWeekdayUTC } from '@/components/common/charts/utils';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
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
  ({ studyWords = [], onInfoPress, hideTitle = true }: RetrievabilityChartProps) => {
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
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${Math.round(point.retrievability)}%`,
        label: formatMonthDayUTC(point.date),
        data: {
          date: point.date,
          averageRetrievability: point.retrievability,
          wordCount: 1,
          criticalWords: 0,
          urgentWords: 0,
        },
      }));
    }, [chartData.dataPoints]);

    // Stabilize x labels and positions to maximize memoization effectiveness
    const xLabels = useMemo(
      () => retrievabilityData.map(d => formatWeekdayUTC(d.date)),
      [retrievabilityData],
    );

    const xLabelPositions = useMemo(() => {
      const allDayPositions = calculateDataPointPositions(retrievabilityData.length);
      return retrievabilityData.map((_, index) => allDayPositions[index] || 0);
    }, [retrievabilityData.length]);

    // 🚀 Unified chart with perfect grid system, danger zones, and 75% target line:
    return (
      <VocabularyChart
        path={chartData.retrievabilityPath}
        dataPoints={chartData.dataPoints}
        performanceZones={chartData.dangerZones} // Danger zones for retrievability
        tooltipDataPoints={dataPoints}
        xLabels={xLabels} // Show all 7 days including days with no data
        xLabelPositions={xLabelPositions}
        yMax={100}
        topPadding={16}
        graphWidth={graphWidth}
        referenceLine={MEMORY_CAPACITY_THRESHOLDS.GOOD} // 75% target line
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        isFuturePrediction={true} // Today is leftmost for future predictions
        emptyStateText=""
      />
    );
  },
);

RetrievabilityChart.displayName = 'RetrievabilityChart';
