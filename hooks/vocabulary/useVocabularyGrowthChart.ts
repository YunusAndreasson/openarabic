import { useMemo } from 'react';

import { DAYS_30 } from '@/constants/chartConstants';
import type { StudyWord } from '@/types/vocabulary.types';
import { buildSmoothChartPath } from '@/utils/chartPathBuilder';
import { createAreaFillPath, generateDateRange } from '@/utils/chartDataUtils';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

interface GrowthDay {
  date: Date;
  count: number;
}

interface VocabularyGrowthChartResult {
  linePath: string;
  areaPath: string;
  endPoint: { x: number; y: number } | null;
  totalWords: number;
  monthChange: number;
}

// Breathing room so the line never kisses the card edges
const TOP_PAD = 8;
const BOTTOM_PAD = 6;
const RIGHT_INSET = 10;

/**
 * Cumulative words-in-practice over the last 30 days for the hero sparkline.
 * Sparkline scaling: the y-range spans the window's own min→max so recent
 * growth stays visible even on a large vocabulary — there is no y-axis,
 * the headline number carries the absolute value. A flat month renders
 * as a low line, not a cliff.
 */
export function useVocabularyGrowthChart(
  studyWords: StudyWord[],
  width: number,
  height: number,
): VocabularyGrowthChartResult {
  return useMemo(() => {
    const createdTimes = studyWords
      .map(word => parseSupabaseTimestamp(word.created_at))
      .filter((date): date is Date => date !== null);

    const dates = generateDateRange(DAYS_30);
    const data: GrowthDay[] = dates.map(date => ({
      date,
      count: createdTimes.filter(created => created <= date).length,
    }));

    if (data.length === 0) {
      return { linePath: '', areaPath: '', endPoint: null, totalWords: 0, monthChange: 0 };
    }

    const counts = data.map(day => day.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = Math.max(1, max - min);

    const innerHeight = height - TOP_PAD - BOTTOM_PAD;
    const lineWidth = width - RIGHT_INSET;
    const positions = data.map((_, index) =>
      data.length <= 1 ? lineWidth : (index / (data.length - 1)) * lineWidth,
    );

    const { path, points } = buildSmoothChartPath({
      data,
      dataPointPositions: positions,
      calculateY: day => TOP_PAD + (1 - (day.count - min) / range) * innerHeight,
      buildPoint: (x, y) => ({ x, y }),
    });

    const endPoint = points[points.length - 1] ?? null;
    const areaPath = path ? createAreaFillPath(path, height, 0, lineWidth) : '';

    const first = counts[0] ?? 0;
    const last = counts[counts.length - 1] ?? 0;

    return {
      linePath: path,
      areaPath,
      endPoint,
      totalWords: last,
      monthChange: last - first,
    };
  }, [studyWords, width, height]);
}
