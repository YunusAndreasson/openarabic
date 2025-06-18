import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/vocabulary/shared';
import {
  generateChartSubtitle,
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
} from '@/components/vocabulary/shared/chartMessages';
import { useGraphWidth } from '@/components/vocabulary/shared/constants';
import { STRINGS } from '@/constants/strings';
import { useEfficiencyChart, type EfficiencyRecord } from '@/hooks/vocabulary/useEfficiencyChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
}

export const EfficiencyChart = memo<EfficiencyChartProps>(
  ({ studyWords = [], onInfoPress, hideTitle = false }: EfficiencyChartProps) => {
    const graphWidth = useGraphWidth();
    const { efficiencyData, chartData } = useEfficiencyChart(studyWords);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentEfficiency, weeklyAverage } = chartData.insights;

      if (currentEfficiency === 0) {
        return STRINGS.PRACTICE_TO_TRACK_LEARNING_SPEED;
      }

      // Use standardized subtitle generator
      return generateChartSubtitle.efficiency(currentEfficiency, weeklyAverage);
    }, [chartData.insights]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<EfficiencyRecord>[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = efficiencyData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.efficiency)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint<EfficiencyRecord>;
        })
        .filter((point): point is DataPoint<EfficiencyRecord> => point !== null);
    }, [chartData.dataPoints, efficiencyData]);

    // 🚀 Unified chart with perfect grid system and performance zones:
    return (
      <VocabularyChart
        path={chartData.efficiencyPath}
        dataPoints={chartData.dataPoints}
        performanceZones={chartData.performanceZones}
        tooltipDataPoints={dataPoints}
        xLabels={efficiencyData
          .filter(data => data && data.wordCount > 0)
          .map(data => data.date.toLocaleDateString('en-US', { weekday: 'short' }))}
        xLabelPositions={chartData.dataPoints.map(point => point.x)}
        yMax={100}
        topPadding={0}
        graphWidth={graphWidth}
        title={CHART_LABELS.SPEED}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.efficiency}
      />
    );
  }
);

EfficiencyChart.displayName = 'EfficiencyChart';
