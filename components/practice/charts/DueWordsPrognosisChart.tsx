import { memo, useMemo } from 'react';

import { VocabularyChart } from '@/components/common/charts';
import type { DataPoint } from '@/types/ui/chart.types';
import { EMPTY_STATE_MESSAGES } from '@/constants/chartMessages';
import { useGraphWidth } from '@/constants/chartConstants';
import { STRINGS } from '@/constants/strings';
import { formatMonthDay, formatWeekday } from '@/utils/chartDataUtils';
import { useChartAxisLabels } from '@/hooks/vocabulary/useChartAxisLabels';
import { getDueWordsAxisMax, useDueWordsChart } from '@/hooks/vocabulary/useDueWordsChart';
import type { StudyWord } from '@/types/vocabulary.types';
import { formatCount } from '@/utils/stringUtils';

interface DueWordsPrognosisChartProps {
  studyWords: StudyWord[];
}

interface DueWordsRecord {
  date: Date;
  dueWords: number;
  newlyDue: number;
  totalWords: number;
}

/**
 * Whole words, no decimals. Hoisted rather than written inline at the call site
 * because VocabularyChart's memo comparator holds every prop to reference
 * equality, and an arrow rebuilt on each render would re-render the chart on
 * every parent render for a function that never changes.
 */
/**
 * Axis ticks only. The gutter holds four characters, so a grouped "2,000" was
 * cut to "2,00"; a tick is a scale mark rather than a reading, and "2k" says the
 * same thing in the room there is. The exact counts are in the summary below.
 */
const THOUSAND = 1000;
const formatAxisTick = (value: number): string =>
  value >= THOUSAND ? `${Number((value / THOUSAND).toFixed(1))}k` : `${value}`;

export const DueWordsPrognosisChart = memo<DueWordsPrognosisChartProps>(
  ({ studyWords = [] }: DueWordsPrognosisChartProps) => {
    const graphWidth = useGraphWidth();
    const { dueWordsData, chartData } = useDueWordsChart(studyWords);
    const { xLabels, xLabelPositions } = useChartAxisLabels(dueWordsData);

    // No title or subtitle: this chart only ever renders inside the /due-words
    // sheet, which states both in its own header. It used to pass them anyway
    // with `hideTitle` defaulting to true, so a subtitle was built on every
    // render for a header that could not draw.

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
        { label: STRINGS.SUMMARY_TODAY, value: formatCount(currentDue) },
        {
          label: STRINGS.SUMMARY_BUSIEST_DAY,
          value: `${busiestLabel} (${formatCount(busiest.dueWords)})`,
        },
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
    const yMax = useMemo(() => getDueWordsAxisMax(dueWordsData), [dueWordsData]);

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
        hasData={chartData.hasData}
        isFuturePrediction={true} // Today is leftmost for future predictions
        emptyStateText={EMPTY_STATE_MESSAGES.dueWords}
        yLabelFormatter={formatAxisTick}
        bottomSummary={bottomSummary}
      />
    );
  },
);

DueWordsPrognosisChart.displayName = 'DueWordsPrognosisChart';
