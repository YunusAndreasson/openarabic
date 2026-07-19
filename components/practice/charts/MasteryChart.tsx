import { memo, useMemo } from 'react';

import { VocabularyChart } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/constants/chartMessages';
import { CHART_VISUAL, useGraphWidth } from '@/constants/chartConstants';
import { STRINGS } from '@/constants/strings';
import { useMasteryChart } from '@/hooks/vocabulary/useMasteryChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

export const MasteryChart = memo<MasteryChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = true }: MasteryChartProps) => {
    const graphWidth = useGraphWidth();

    // Add top padding to prevent dots from being cut off
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

    const {
      masteryPath,
      hasData,
      milestones,
      points,
      tooltipPoints: dataPoints,
      subtitle,
      xLabelPositions,
      xLabels,
      maxCount,
      insights,
    } = useMasteryChart(studyWords);

    const tooltipDataPoints = dataPoints ?? [];

    // Plain totals under the chart: "Mastered 87 · This month +5"
    const bottomSummary = useMemo(() => {
      const windowChange = insights.windowChange ?? 0;
      return [
        { label: STRINGS.SUMMARY_MASTERED, value: `${insights.totalMastered}` },
        ...(windowChange > 0
          ? [{ label: STRINGS.SUMMARY_THIS_MONTH, value: `+${windowChange}` }]
          : []),
      ];
    }, [insights.totalMastered, insights.windowChange]);

    // 🚀 Unified chart with clean single-color design (no performance zones):
    return (
      <VocabularyChart
        path={masteryPath}
        dataPoints={points}
        milestones={milestones} // Special milestones for mastery chart
        tooltipDataPoints={tooltipDataPoints}
        xLabels={xLabels}
        xLabelPositions={xLabelPositions}
        yMax={maxCount}
        yLabelFormatter={(value: number) => value.toString()}
        topPadding={TOP_PADDING}
        graphWidth={graphWidth}
        title={CHART_LABELS.STRENGTH}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.mastery}
        bottomSummary={bottomSummary}
      />
    );
  },
);

MasteryChart.displayName = 'MasteryChart';
