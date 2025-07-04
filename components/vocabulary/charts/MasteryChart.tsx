import { memo, useMemo } from 'react';

import { VocabularyChart } from '@/components/vocabulary/shared';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/vocabulary/shared/chartMessages';
import { CHART_VISUAL, useGraphWidth } from '@/components/vocabulary/shared/constants';
import { useMasteryChart } from '@/hooks/vocabulary/useMasteryChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  hideTitle?: boolean;
}

export const MasteryChart = memo<MasteryChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = false }: MasteryChartProps) => {
    const graphWidth = useGraphWidth();

    // Add top padding to prevent dots from being cut off
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

    const {
      masteryPath,
      hasData,
      performanceZones,
      milestones,
      points,
      tooltipPoints: dataPoints,
      subtitle,
      xLabelPositions,
      xLabels,
    } = useMasteryChart(studyWords);

    // Prepare tooltip data points for interactivity
    const tooltipDataPoints = useMemo(() => {
      return dataPoints || [];
    }, [dataPoints]);

    // 🚀 Unified chart with perfect grid system and milestone support:
    return (
      <VocabularyChart
        path={masteryPath}
        dataPoints={points}
        performanceZones={performanceZones}
        milestones={milestones} // Special milestones for mastery chart
        tooltipDataPoints={tooltipDataPoints}
        xLabels={xLabels}
        xLabelPositions={xLabelPositions}
        yMax={100}
        topPadding={TOP_PADDING}
        graphWidth={graphWidth}
        title={CHART_LABELS.STRENGTH}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.mastery}
      />
    );
  }
);

MasteryChart.displayName = 'MasteryChart';
