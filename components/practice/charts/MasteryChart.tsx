import { memo, useMemo } from 'react';

import { VocabularyChart } from '@/components/common/charts';
import { CHART_LABELS, EMPTY_STATE_MESSAGES } from '@/components/common/charts/chartMessages';
import { CHART_VISUAL, useGraphWidth } from '@/components/common/charts/constants';
import { STRINGS } from '@/constants/strings';
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
      insights,
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
        onCardPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.mastery}
        bottomSummary={
          hasData
            ? [
                { label: STRINGS.LATEST, value: `${insights.currentRate}%` },
                {
                  label: STRINGS.AVERAGE,
                  value: `${Math.round(
                    points.length > 0 ? points.reduce((s, p) => s + p.rate, 0) / points.length : 0
                  )}%`,
                },
                {
                  label: STRINGS.MAX,
                  value: `${Math.round(Math.max(0, ...points.map(p => p.rate)))}%`,
                },
              ]
            : []
        }
      />
    );
  }
);

MasteryChart.displayName = 'MasteryChart';
