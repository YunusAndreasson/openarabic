import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/common/charts/ChartMessages';
import { calculateDataPointPositions, useGraphWidth } from '@/components/common/charts/constants';
import { formatMonthDayUTC, formatWeekdayUTC } from '@/components/common/charts/utils';
import { useDueWordsChart } from '@/hooks/vocabulary/useDueWordsChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface DueWordsPrognosisChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

interface DueWordsRecord {
  date: Date;
  dueWords: number;
  newlyDue: number;
  totalWords: number;
}

export const DueWordsPrognosisChart = memo<DueWordsPrognosisChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = true }: DueWordsPrognosisChartProps) => {
    const graphWidth = useGraphWidth();
    const { dueWordsData, chartData } = useDueWordsChart(studyWords);

    // Generate subtitle showing current and peak due words
    // Explains that Y-axis numbers represent word counts
    const subtitle = useMemo(() => {
      const { currentDue, peakDue, trend } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return EMPTY_STATE_MESSAGES.dueWords;
      }

      const trendText =
        trend === 'increasing'
          ? '↗️ Increasing'
          : trend === 'decreasing'
            ? '↘️ Decreasing'
            : '→ Stable';

      // Clarify that numbers represent words (Y-axis explanation)
      return `${currentDue} words due today, peak ${peakDue} words • ${trendText}`;
    }, [chartData.insights, studyWords.length]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<DueWordsRecord>[] = useMemo(() => {
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${point.dueWords}`,
        label: formatMonthDayUTC(point.date),
        data: {
          date: point.date,
          dueWords: point.dueWords,
          newlyDue: 0, // Will be calculated from dueWordsData
          totalWords: studyWords.length,
        },
      }));
    }, [chartData.dataPoints, studyWords.length]);

    // Stabilize x labels and positions to maximize memoization effectiveness
    const xLabels = useMemo(() => dueWordsData.map(d => formatWeekdayUTC(d.date)), [dueWordsData]);

    const xLabelPositions = useMemo(() => {
      const allDayPositions = calculateDataPointPositions(dueWordsData.length);
      return dueWordsData.map((_, index) => allDayPositions[index] || 0);
    }, [dueWordsData.length]);

    // Calculate the maximum Y value for better scaling
    const yMax = useMemo(() => {
      const maxDue = Math.max(...dueWordsData.map(d => d.dueWords));
      return Math.max(10, maxDue); // Minimum scale of 10
    }, [dueWordsData]);

    // 🚀 Unified chart with due words progression:
    return (
      <VocabularyChart
        path={chartData.dueWordsPath}
        dataPoints={chartData.dataPoints}
        tooltipDataPoints={dataPoints}
        xLabels={xLabels} // Show all 7 days
        xLabelPositions={xLabelPositions}
        yMax={yMax}
        topPadding={16}
        graphWidth={graphWidth}
        title={CHART_LABELS.DUE_WORDS_PROGNOSIS}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        isFuturePrediction={true} // Today is leftmost for future predictions
        emptyStateText=""
        yLabelFormatter={(value: number) => `${value}`}
      />
    );
  },
);

DueWordsPrognosisChart.displayName = 'DueWordsPrognosisChart';
