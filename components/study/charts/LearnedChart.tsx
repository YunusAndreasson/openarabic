import { memo, useMemo } from 'react';

import { VocabularyChart } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/common/charts/ChartMessages';
import { CHART_VISUAL, useGraphWidth } from '@/components/common/charts/constants';
import { useLearnedChart } from '@/hooks/vocabulary/useLearnedChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface LearnedChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

export const LearnedChart = memo<LearnedChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = false }: LearnedChartProps) => {
    const graphWidth = useGraphWidth();

    // Add top padding to prevent dots from being cut off
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

    const {
      learnedPath,
      hasData,
      milestones,
      points,
      tooltipPoints: dataPoints,
      subtitle,
      xLabelPositions,
      xLabels,
      maxCount,
    } = useLearnedChart(studyWords);

    // Prepare tooltip data points for interactivity
    const tooltipDataPoints = useMemo(() => {
      return dataPoints || [];
    }, [dataPoints]);

    // 🚀 Unified chart with clean single-color design (no performance zones):
    return (
      <VocabularyChart
        path={learnedPath}
        dataPoints={points}
        milestones={milestones} // Special milestones for learned chart
        tooltipDataPoints={tooltipDataPoints}
        xLabels={xLabels}
        xLabelPositions={xLabelPositions}
        yMax={maxCount}
        yLabelFormatter={(value: number) => value.toString()}
        topPadding={TOP_PADDING}
        graphWidth={graphWidth}
        title={CHART_LABELS.LEARNED}
        subtitle={subtitle}
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.learned}
      />
    );
  }
);

LearnedChart.displayName = 'LearnedChart';
