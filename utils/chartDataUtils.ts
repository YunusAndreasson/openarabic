import type { ChartColors } from '@/types/ui/chart.types';
import type { StudyWord } from '@/types/vocabulary.types';

import { PERFORMANCE_THRESHOLDS } from '@/constants/chartConstants';

// Generate date range for charts - using UTC to avoid timezone issues
export const generateDateRange = (days: number) => {
  const today = new Date();
  // Create UTC date for today at 23:59:59.999
  const utcToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999),
  );

  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() - i);
    dates.push(date);
  }

  return dates;
};

// Note: calculateRetrievability is available from @/utils/fsrsUtils

const safeNum = (val: number | null | undefined, fallback: number) =>
  isNaN(val ?? fallback) ? fallback : (val ?? fallback);

// Calculate learning efficiency score
export const calculateEfficiencyScore = (word: StudyWord): number => {
  const difficulty = safeNum(word.fsrs_difficulty, 6.5);
  const lapses = safeNum(word.fsrs_lapses, 0);
  const stability = safeNum(word.fsrs_stability, 0);
  const state = safeNum(word.fsrs_state, 0);
  const reps = safeNum(word.fsrs_reps, 0);

  let score = 0;

  // State progression (40% weight) - aligned with FSRS states
  if (state === 2 && stability >= 5) {
    // Mastered: review state with good stability
    score += 40;
  } else if (state === 2 && stability < 5) {
    // Review but unstable
    score += 30;
  } else if (state === 1 && reps > 1) {
    // Learning with progress
    score += 25;
  } else if (state === 0 && reps === 1) {
    // Just started learning
    score += 15;
  } else if (state === 3) {
    // Relearning (failed)
    score += 10;
  }

  // Stability quality (30% weight) - better thresholds
  if (stability >= 30) score += 30;
  else if (stability >= 14) score += 25;
  else if (stability >= 7) score += 20;
  else if (stability >= 3) score += 15;
  else if (stability >= 1) score += 10;
  else if (stability > 0) score += 5;

  // Lapse rate (20% weight) - penalize failures more appropriately
  if (lapses === 0) score += 20;
  else if (lapses === 1) score += 15;
  else if (lapses === 2) score += 10;
  else if (lapses <= 4) score += 5;
  // No points for 5+ lapses

  // Difficulty balance (10% weight) - FSRS difficulty ranges 5-10, optimal around 6.5-8.0
  if (difficulty >= 6.0 && difficulty <= 8.5)
    score += 10; // Optimal learning zone
  else if (difficulty >= 5.5 && difficulty <= 9.0)
    score += 7; // Good range
  else if (difficulty >= 5.0 && difficulty <= 9.5)
    score += 5; // Acceptable range
  else if (difficulty >= 4.5 && difficulty <= 10.0) score += 2; // Edge cases

  return Math.min(100, score); // Cap at 100
};

/**
 * Creates standardized performance zones for charts
 * 3-zone system matching the memory gauge for visual consistency:
 * - Green: 75%+ (excellent retention)
 * - Orange: 40-74% (moderate retention)
 * - Red: <40% (poor retention, needs urgent practice)
 *
 * @param chartHeight - Height of the chart area
 * @param topPadding - Top padding (default 0)
 * @param chartColors - Chart colors object
 * @returns Array of performance zone objects
 */
export const createStandardizedPerformanceZones = (
  chartHeight: number,
  topPadding: number = 0,
  chartColors: ChartColors,
) => {
  const availableHeight = chartHeight - topPadding;

  return [
    {
      name: 'Excellent',
      min: PERFORMANCE_THRESHOLDS.EXCELLENT, // 75%
      max: 100,
      color: chartColors.performance.excellent, // Full opacity to match gauge
      y: topPadding,
      height: ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
    },
    {
      name: 'Moderate',
      min: PERFORMANCE_THRESHOLDS.FAIR, // 40%
      max: PERFORMANCE_THRESHOLDS.EXCELLENT, // 75%
      color: chartColors.performance.moderate, // Full opacity to match gauge
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
      height:
        ((PERFORMANCE_THRESHOLDS.EXCELLENT - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
    },
    {
      name: 'Poor',
      min: PERFORMANCE_THRESHOLDS.POOR, // 0%
      max: PERFORMANCE_THRESHOLDS.FAIR, // 40%
      color: chartColors.performance.poor, // Full opacity to match gauge
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
      height: ((PERFORMANCE_THRESHOLDS.FAIR - PERFORMANCE_THRESHOLDS.POOR) / 100) * availableHeight,
    },
  ];
};

/**
 * Creates a smooth area fill path for line charts
 * @param smoothPath - The main line path
 * @param graphHeight - Height of the graph
 * @param firstX - X coordinate of the first data point (optional, defaults to 0)
 * @param lastX - X coordinate of the last data point (required for proper area fill)
 * @returns Area fill path string with vertical edges (not tilted)
 */
export const createAreaFillPath = (
  smoothPath: string,
  graphHeight: number,
  firstX?: number,
  lastX?: number,
): string => {
  // Use provided coordinates or fall back to defaults
  const startX = firstX ?? 0;
  const endX = lastX ?? 0;

  // Create vertical edges for fill area:
  // 1. Follow the smooth path from start to end
  // 2. Drop straight down from last point: L endX graphHeight
  // 3. Go left along bottom: L startX graphHeight
  // 4. Close path by going back up to start: Z
  return `${smoothPath} L ${endX} ${graphHeight} L ${startX} ${graphHeight} Z`;
};

// Local-time date label helpers (DRY across the forecast charts).
// The forecast buckets are built at LOCAL end-of-day (fsrsUtils
// generateForecastDates), so labels must render in the device timezone —
// formatting them as UTC shifted every label a day forward west of UTC.
export const formatWeekday = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

export const formatMonthDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
