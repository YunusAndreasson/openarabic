import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/constants/chartMessages';
import { useGraphWidth } from '@/constants/chartConstants';
import { STRINGS } from '@/constants/strings';
import { formatMonthDay, formatWeekday } from '@/utils/chartDataUtils';
import { useChartAxisLabels } from '@/hooks/vocabulary/useChartAxisLabels';
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
    const { xLabels, xLabelPositions } = useChartAxisLabels(dueWordsData);

    // Subtitle: today's count + the heaviest upcoming day, in plain words
    const subtitle = useMemo(() => {
      const { currentDue, peakDue } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return EMPTY_STATE_MESSAGES.dueWords;
      }

      return `${currentDue} ${STRINGS.TODAY_TO_REVIEW} · peak ${peakDue}`;
    }, [chartData.insights, studyWords.length]);

    // The busiest upcoming day — the actionable fact in this forecast
    const bottomSummary = useMemo(() => {
      const { currentDue } = chartData.insights;
      const busiest = dueWordsData.reduce(
        (max, day) => (day.dueWords > max.dueWords ? day : max),
        dueWordsData[0] ?? { date: new Date(), dueWords: 0, newlyDue: 0, totalWords: 0 },
      );
      const busiestLabel =
        busiest.date.toDateString() === new Date().toDateString()
          ? STRINGS.SUMMARY_TODAY
          : formatWeekday(busiest.date);

      return [
        { label: STRINGS.SUMMARY_TODAY, value: `${currentDue}` },
        { label: STRINGS.SUMMARY_BUSIEST_DAY, value: `${busiestLabel} (${busiest.dueWords})` },
      ];
    }, [chartData.insights, dueWordsData]);

    // Prepare data points for interactive tooltips — newlyDue comes from the
    // forecast data (same index order as the chart points)
    const dataPoints: DataPoint<DueWordsRecord>[] = useMemo(() => {
      return chartData.dataPoints.map((point, index) => {
        const newlyDue = dueWordsData[index]?.newlyDue ?? 0;
        // Days after today break out how many of the due words are new that day
        const newSuffix =
          index > 0 && newlyDue > 0 ? ` · +${newlyDue} ${STRINGS.NEWLY_DUE_SUFFIX}` : '';
        return {
          x: point.x,
          y: point.y,
          value: `${point.dueWords}${newSuffix}`,
          label: formatMonthDay(point.date),
          data: {
            date: point.date,
            dueWords: point.dueWords,
            newlyDue,
            totalWords: studyWords.length,
          },
        };
      });
    }, [chartData.dataPoints, dueWordsData, studyWords.length]);

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
        emptyStateText={EMPTY_STATE_MESSAGES.dueWords}
        yLabelFormatter={(value: number) => `${value}`}
        bottomSummary={bottomSummary}
      />
    );
  },
);

DueWordsPrognosisChart.displayName = 'DueWordsPrognosisChart';
