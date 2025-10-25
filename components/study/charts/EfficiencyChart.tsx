import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/common/charts/ChartMessages';
import { calculateDataPointPositions, useGraphWidth } from '@/components/common/charts/constants';
import { formatMonthDayUTC, formatWeekdayUTC } from '@/components/common/charts/utils';
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

    // Use real units (words/day) for clarity instead of percentages
    const subtitle = useMemo(() => {
      const { currentEfficiency } = chartData.insights;
      if (currentEfficiency === 0) return STRINGS.START_PRACTICING_TO_SEE_SPEED;
      // Keep it short to avoid truncation: just the current value with unit
      return `${currentEfficiency} ${STRINGS.WORDS_PER_DAY}`;
    }, [chartData.insights]);

    // Prepare data points in words/day for interactivity
    const dataPoints: DataPoint<EfficiencyRecord>[] = useMemo(() => {
      return chartData.dataPoints.map(point => ({
        x: point.x,
        y: point.y,
        value: `${Math.round(point.efficiency)} ${STRINGS.WORDS_PER_DAY_SHORT}`,
        label: formatMonthDayUTC(point.date),
        data: {
          date: point.date,
          averageEfficiency: point.efficiency,
          wordCount: 1,
        },
      }));
    }, [chartData.dataPoints]);

    // Stabilize x labels and positions to maximize memoization effectiveness
    const xLabels = useMemo(
      () => efficiencyData.map(d => formatWeekdayUTC(d.date)),
      [efficiencyData],
    );

    const xLabelPositions = useMemo(() => {
      const allDayPositions = calculateDataPointPositions(efficiencyData.length);
      return efficiencyData.map((_, index) => allDayPositions[index] || 0);
    }, [efficiencyData.length]);

    // 🚀 Unified chart with clean single-color design (no performance zones):
    return (
      <VocabularyChart
        path={chartData.efficiencyPath}
        dataPoints={chartData.dataPoints}
        tooltipDataPoints={dataPoints}
        xLabels={xLabels}
        xLabelPositions={xLabelPositions}
        yMax={
          chartData.insights.weeklyAverage > 20
            ? Math.max(40, chartData.insights.weeklyAverage * 1.5)
            : 40
        }
        topPadding={0}
        graphWidth={graphWidth}
        title={CHART_LABELS.SPEED}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.efficiency}
        yLabelFormatter={(v: number) => `${Math.round(v)}`}
      />
    );
  },
);

EfficiencyChart.displayName = 'EfficiencyChart';
