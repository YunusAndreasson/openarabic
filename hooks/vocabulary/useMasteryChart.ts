import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import type { DataPoint } from '@/components/vocabulary/shared';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { generateChartSubtitle } from '@/components/vocabulary/shared/chartMessages';
import {
  GRAPH_HEIGHT_LARGE,
  DAYS_7,
  CHART_VISUAL,
  useGraphWidth,
} from '@/components/vocabulary/shared/constants';
import {
  generateDateRange,
  createStandardizedPerformanceZones,
} from '@/components/vocabulary/shared/utils';
import type { StudyWord } from '@/types/vocabulary.types';

interface Milestone {
  x: number;
  y: number;
  rate: number;
  achieved: boolean;
  date: Date;
}

interface ChartPoint {
  x: number;
  y: number;
  rate: number;
  date: Date;
}

interface MasteryRecord {
  date: Date;
  masteredCount: number;
  totalCount: number;
  masteryRate: number;
}

interface ChartInsights {
  currentRate: number;
  trend: 'declining' | 'improving' | 'stable';
  totalMastered: number;
  weeklyChange?: number;
}

interface ChartData {
  masteryPath: string;
  hasData: boolean;
  performanceZones?: ReturnType<typeof createStandardizedPerformanceZones>;
  milestones: Milestone[];
  points: ChartPoint[];
  insights: ChartInsights;
}

interface UseMasteryChartReturn {
  masteryPath: string;
  hasData: boolean;
  performanceZones?: ReturnType<typeof createStandardizedPerformanceZones>;
  milestones: Milestone[];
  points: ChartPoint[];
  tooltipPoints: DataPoint<MasteryRecord>[];
  subtitle: string;
  xLabels: string[];
  xLabelPositions: number[];
  insights: ChartInsights;
}

export function useMasteryChart(studyWords: StudyWord[] = []): UseMasteryChartReturn {
  const chartColors = useChartColors();
  const graphWidth = useGraphWidth();
  const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

  const parsedWords = useMemo(
    () =>
      studyWords.map(word => ({
        createdAt: new Date(word.created_at),
        lastReview: word.fsrs_last_review
          ? new Date(word.fsrs_last_review)
          : null,
        state: word.fsrs_state,
        stability: word.fsrs_stability ?? 0,
      })),
    [studyWords]
  );

  const masteryData = useMemo(() => {
    const dates = generateDateRange(DAYS_7);

    return dates.map(date => {
      let masteredCount = 0;
      let totalCount = 0;

      parsedWords.forEach(word => {
        if (word.createdAt <= date) {
          totalCount++;

          const { state, stability, lastReview } = word;

          if (state === 2 && stability >= 5 && lastReview && lastReview <= date) {
            masteredCount++;
          }
        }
      });

      const masteryRate = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;
      return { date, masteredCount, totalCount, masteryRate };
    });
  }, [parsedWords]);

  const chartData = useMemo<ChartData>(() => {
    if (masteryData.length === 0) {
      return {
        masteryPath: '',
        hasData: false,
        performanceZones: undefined,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
      };
    }

    const hasData = masteryData.some(d => d.totalCount > 0);
    if (!hasData) {
      return {
        masteryPath: '',
        hasData: false,
        performanceZones: undefined,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
      };
    }

    const maxRate = Math.max(100, Math.max(...masteryData.map(d => d.masteryRate)));
    const stepX = graphWidth / Math.max(1, masteryData.length - 1);
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;

    const path = Skia.Path.Make();
    const points: ChartPoint[] = [];

    masteryData.forEach((data, index) => {
      const x = index * stepX;
      const y = TOP_PADDING + (chartHeight - (data.masteryRate / maxRate) * chartHeight);
      points.push({ x, y, rate: data.masteryRate, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else if (masteryData.length > 1) {
        const prevPoint = points[index - 1];
        if (prevPoint) {
          const controlX1 = prevPoint.x + (x - prevPoint.x) * 0.3;
          const controlY1 = prevPoint.y;
          const controlX2 = prevPoint.x + (x - prevPoint.x) * 0.7;
          const controlY2 = y;
          path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
        }
      }
    });

    const milestones = [25, 50, 75, 90]
      .map(target => {
        const milestone = masteryData.find(d => d.masteryRate >= target);
        if (milestone) {
          const index = masteryData.indexOf(milestone);
          const x = index * stepX;
          const y = TOP_PADDING + (chartHeight - (milestone.masteryRate / maxRate) * chartHeight);
          return { x, y, rate: target, achieved: true, date: milestone.date } as Milestone;
        }
        return { x: 0, y: 0, rate: target, achieved: false, date: new Date() } as Milestone;
      })
      .filter(m => m.achieved);

    const recent = masteryData.slice(-4);
    const older = masteryData.slice(-7, -4);

    const currentRate = recent[recent.length - 1]?.masteryRate || 0;
    const recentAvg =
      recent.length > 0 ? recent.reduce((sum, day) => sum + day.masteryRate, 0) / recent.length : 0;
    const olderAvg =
      older.length > 0 ? older.reduce((sum, day) => sum + day.masteryRate, 0) / older.length : 0;

    const change = recentAvg - olderAvg;
    const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';
    const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

    const performanceZones = createStandardizedPerformanceZones(
      chartHeight,
      TOP_PADDING,
      chartColors
    );

    return {
      masteryPath: path.toSVGString(),
      hasData: true,
      performanceZones,
      milestones,
      points,
      insights: {
        currentRate: Math.round(currentRate),
        trend,
        totalMastered,
        weeklyChange: Math.round(change),
      },
    };
  }, [masteryData, graphWidth, chartColors]);

  const subtitle = useMemo(() => {
    const { currentRate, trend, weeklyChange } = chartData.insights;

    if (currentRate === 0) {
      return 'Start reviewing to build memory strength';
    }

    return generateChartSubtitle.mastery(currentRate, trend, weeklyChange ?? 0);
  }, [chartData.insights]);

  const tooltipPoints: DataPoint<MasteryRecord>[] = useMemo(() => {
    return chartData.points
      .map((point, index) => {
        const data = masteryData[index];
        if (!data) return null;

        return {
          x: point.x,
          y: point.y,
          value: `${Math.round(point.rate)}%`,
          label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data,
        } as DataPoint<MasteryRecord>;
      })
      .filter((point): point is DataPoint<MasteryRecord> => point !== null);
  }, [chartData.points, masteryData]);

  const xLabels = useMemo(
    () => masteryData.map(d => d.date.toLocaleDateString('en-US', { weekday: 'short' })),
    [masteryData]
  );
  const xLabelPositions = useMemo(() => chartData.points.map(p => p.x), [chartData.points]);

  return {
    masteryPath: chartData.masteryPath,
    hasData: chartData.hasData,
    performanceZones: chartData.performanceZones,
    milestones: chartData.milestones,
    points: chartData.points,
    tooltipPoints,
    subtitle,
    xLabels,
    xLabelPositions,
    insights: chartData.insights,
  };
}

export default useMasteryChart;
