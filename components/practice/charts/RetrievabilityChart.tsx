import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import {
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
  generateChartSubtitle,
} from '@/constants/chartMessages';
import { useGraphWidth } from '@/constants/chartConstants';
import { formatMonthDay } from '@/utils/chartDataUtils';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useChartAxisLabels } from '@/hooks/vocabulary/useChartAxisLabels';
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
    const { xLabels, xLabelPositions } = useChartAxisLabels(retrievabilityData);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords, measuredWords } = chartData.insights;

      // Counted over the words the curve actually speaks for, not everything
      // saved — the subtitle quotes this total back to the learner.
      if (measuredWords === 0) {
        return STRINGS.STUDY_WORDS_TO_TRACK_MEMORY_RETENTION;
      }

      return generateChartSubtitle.retrievability(
        currentRetrievability,
        criticalWords,
        measuredWords,
      );
    }, [chartData.insights]);

    // Concrete numbers under the chart: now → week-from-now → words at risk
    const bottomSummary = useMemo(() => {
      const { currentRetrievability, weekRetrievability, criticalWords } = chartData.insights;
      return [
        { label: STRINGS.SUMMARY_TODAY, value: `${currentRetrievability}%` },
        { label: STRINGS.SUMMARY_IN_A_WEEK, value: `${weekRetrievability}%` },
        ...(criticalWords > 0
          ? [
              {
                label: STRINGS.SUMMARY_AT_RISK,
                value: `${criticalWords} ${STRINGS.SUMMARY_WORDS_SUFFIX}`,
              },
            ]
          : []),
      ];
    }, [chartData.insights]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<RetrievabilityRecord>[] = useMemo(() => {
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${Math.round(point.retrievability)}%`,
        label: formatMonthDay(point.date),
        data: {
          date: point.date,
          averageRetrievability: point.retrievability,
          wordCount: 1,
          criticalWords: 0,
          urgentWords: 0,
        },
      }));
    }, [chartData.dataPoints]);

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
        showAreaFill={false} // No sage overlay - let performance zones show clearly
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        isFuturePrediction={true} // Today is leftmost for future predictions
        emptyStateText={EMPTY_STATE_MESSAGES.retrievability}
        bottomSummary={bottomSummary}
      />
    );
  },
);

RetrievabilityChart.displayName = 'RetrievabilityChart';
