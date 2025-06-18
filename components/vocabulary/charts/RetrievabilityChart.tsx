import { memo, useMemo } from 'react';

import { VocabularyChart, type DataPoint } from '@/components/vocabulary/shared';
import {
  generateChartSubtitle,
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
} from '@/components/vocabulary/shared/chartMessages';
import { useGraphWidth } from '@/components/vocabulary/shared/constants';
import { STRINGS } from '@/constants/strings';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
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
  ({ studyWords = [], onInfoPress, hideTitle = false }: RetrievabilityChartProps) => {
    const graphWidth = useGraphWidth();
    const { retrievabilityData, chartData } = useRetrievabilityChart(studyWords);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return STRINGS.STUDY_WORDS_TO_TRACK_MEMORY_RETENTION;
      }

      return generateChartSubtitle.retrievability(currentRetrievability, criticalWords, totalWords);
    }, [chartData.insights, studyWords.length]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint<RetrievabilityRecord>[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = retrievabilityData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.retrievability)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint<RetrievabilityRecord>;
        })
        .filter((point): point is DataPoint<RetrievabilityRecord> => point !== null);
    }, [chartData.dataPoints, retrievabilityData]);

    // 🚀 Unified chart with perfect grid system and danger zones:
    return (
      <VocabularyChart
        path={chartData.retrievabilityPath}
        dataPoints={chartData.dataPoints}
        performanceZones={chartData.dangerZones} // Danger zones for retrievability
        tooltipDataPoints={dataPoints}
        xLabels={retrievabilityData
          .filter(data => data && data.wordCount > 0)
          .map(data => data.date.toLocaleDateString('en-US', { weekday: 'short' }))}
        xLabelPositions={chartData.dataPoints.map(point => point.x)}
        yMax={100}
        topPadding={0}
        graphWidth={graphWidth}
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        emptyStateText={EMPTY_STATE_MESSAGES.retrievability}
      />
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';
