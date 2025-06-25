/**
 * Memory Capacity Gauge Hook
 *
 * Calculates learning capacity metrics using FSRS algorithm data to determine
 * optimal timing for adding new vocabulary words. Based on cognitive science
 * research on memory load and spaced repetition effectiveness.
 *
 * CAPACITY THRESHOLDS (scientifically grounded):
 * - 70%+ (GREEN): Ready to add words - memory load is manageable
 * - 40-70% (YELLOW): Add with caution - approaching cognitive limits
 * - <40% (RED): Practice current words first - memory overload risk
 *
 * SCIENTIFIC BASIS:
 * - Prevents cognitive interference from too many concurrent items
 * - Maintains optimal challenge level (desirable difficulty)
 * - Follows spacing effect principles for maximum retention
 * - Aligns with working memory capacity research (Miller's Law)
 */

import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { isStrugglingWord } from '@/utils/wordClassification';

export interface MemoryCapacityMetrics {
  capacityScore: number;
  trend: 'improving' | 'stable';
}

export interface GaugePaths {
  fullPath: ReturnType<typeof Skia.Path.Make>;
  filledPath: ReturnType<typeof Skia.Path.Make>;
  filledSweep: number;
}

export interface IndicatorPosition {
  x: number;
  y: number;
  angle: number;
}

export interface UseMemoryCapacityGaugeProps {
  studyWords: StudyWord[];
  width: number;
  height: number;
  radius: number;
  strokeWidth: number;
}

export function useMemoryCapacityGauge({
  studyWords,
  width,
  height,
  radius,
  strokeWidth,
}: UseMemoryCapacityGaugeProps) {
  const colors = useColors();
  const chartColors = useChartColors();

  const memoryMetrics = useMemo<MemoryCapacityMetrics>(() => {
    if (!studyWords.length) {
      return { capacityScore: 85, trend: 'stable' };
    }

    const validWords = studyWords.filter(
      w => w.fsrs_stability != null && w.fsrs_difficulty != null
    );
    if (!validWords.length) {
      return { capacityScore: 85, trend: 'stable' };
    }

    const { stabilitySum, difficultySum, repsSum } = validWords.reduce(
      (acc, word) => {
        acc.stabilitySum += word.fsrs_stability ?? 0;
        acc.difficultySum += word.fsrs_difficulty ?? 5;
        acc.repsSum += word.fsrs_reps ?? 0;
        return acc;
      },
      { stabilitySum: 0, difficultySum: 0, repsSum: 0 }
    );

    const averageStability = stabilitySum / validWords.length;
    const averageDifficulty = difficultySum / validWords.length;
    const averageReps = repsSum / validWords.length;

    const stabilityFactor = Math.min(averageStability / 30, 1) * 45;
    const repsFactor = Math.min(averageReps / 10, 1) * 30;
    const difficultyFactor = Math.max(0, (10 - averageDifficulty) / 10) * 25;

    const capacityScore = Math.round(stabilityFactor + repsFactor + difficultyFactor);

    // Trend calculation aligned with 3-phase system
    // Only show "improving" in green phase when memory is actually in good state
    const hasUrgentWords = studyWords.some(word => {
      const now = new Date().toISOString();
      const isDue = (word.fsrs_due ?? '9999-12-31') <= now;
      const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
      const isStruggling = hasBeenReviewed && isStrugglingWord(word);
      return isDue || isStruggling;
    });

    const trend = !hasUrgentWords && averageReps > 2 ? 'improving' : 'stable';

    return {
      capacityScore: Math.max(15, Math.min(100, capacityScore)),
      trend,
    };
  }, [studyWords]);

  // Calculate word states for proper phase determination
  const wordStates = useMemo(() => {
    const now = new Date().toISOString();

    const dueWords = studyWords.filter(word => (word.fsrs_due ?? '9999-12-31') <= now).length;

    const strugglingWords = studyWords.filter(word => {
      const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
      return hasBeenReviewed && isStrugglingWord(word);
    }).length;

    return { dueWords, strugglingWords };
  }, [studyWords]);

  // Helper function for visual score calculation (used by both gauge and indicator)
  const getVisualScore = useMemo(() => {
    let visualScore = memoryMetrics.capacityScore;

    // RED PHASE: Due words present - cap visual at 40% (red territory)
    if (wordStates.dueWords > 0) {
      visualScore = Math.min(visualScore, CAPACITY_THRESHOLDS.CAUTION);
    }
    // YELLOW PHASE: Struggling words present - cap visual at 70% (yellow territory)
    else if (wordStates.strugglingWords > 0) {
      visualScore = Math.min(visualScore, CAPACITY_THRESHOLDS.READY);
    }
    // GREEN PHASE: Use actual score (can go up to 100%)

    return visualScore;
  }, [memoryMetrics.capacityScore, wordStates.dueWords, wordStates.strugglingWords]);

  const gaugePaths = useMemo<GaugePaths>(() => {
    const centerX = width / 2;
    const centerY = height - 15;
    const startAngle = 185;
    const totalSweep = 170;

    const fullPath = Skia.Path.Make();
    fullPath.addArc(
      {
        x: centerX - radius,
        y: centerY - radius,
        width: radius * 2,
        height: radius * 2,
      },
      startAngle,
      totalSweep
    );

    const filledSweep = (getVisualScore / 100) * totalSweep;
    const filledPath = Skia.Path.Make();
    filledPath.addArc(
      {
        x: centerX - radius,
        y: centerY - radius,
        width: radius * 2,
        height: radius * 2,
      },
      startAngle,
      filledSweep
    );

    return { fullPath, filledPath, filledSweep };
  }, [getVisualScore, width, height, radius]);

  const getFilledGradientColors = (): string[] => {
    const baseColors = [
      chartColors.performance.poor ?? colors.error,
      chartColors.performance.moderate ?? colors.warning,
      chartColors.performance.good ?? colors.info,
      chartColors.performance.excellent ?? colors.success,
    ];

    // RED PHASE: Due words present - subtle red gradient for visual interest
    if (wordStates.dueWords > 0) {
      return [baseColors[0] as string, baseColors[1] as string];
    }

    // YELLOW PHASE: Struggling words present - red to orange gradient
    if (wordStates.strugglingWords > 0) {
      return [baseColors[0] as string, baseColors[1] as string];
    }

    // GREEN PHASE: No urgent words - use appropriate range based on actual score
    if (getVisualScore <= 30) {
      return [baseColors[0] as string, baseColors[1] as string];
    }
    if (getVisualScore <= 70) {
      return [baseColors[0] as string, baseColors[1] as string, baseColors[2] as string];
    }
    return baseColors;
  };

  const getFilledGradientPositions = (): number[] => {
    // RED PHASE: Due words present - gradient from pure red to slight orange for visual interest
    if (wordStates.dueWords > 0) {
      return [0, 1];
    }

    // YELLOW PHASE: Struggling words present - red to orange gradient
    if (wordStates.strugglingWords > 0) {
      return [0, 1];
    }

    // GREEN PHASE: Use normal gradient positions based on visual score
    if (getVisualScore <= 30) {
      return [0, 1];
    }
    if (getVisualScore <= 70) {
      return [0, 30 / getVisualScore, 1];
    }
    return [0, 30 / getVisualScore, 70 / getVisualScore, 1];
  };

  const indicatorPosition = useMemo<IndicatorPosition>(() => {
    const centerX = width / 2;
    const centerY = height - 15;

    const angle = 185 - (getVisualScore / 100) * 170;
    const angleRad = (angle * Math.PI) / 180;

    const indicatorRadius = radius - strokeWidth / 2;
    const x = centerX + Math.cos(angleRad) * indicatorRadius;
    const y = centerY + Math.sin(angleRad) * indicatorRadius;

    return { x, y, angle };
  }, [getVisualScore, width, height, radius, strokeWidth]);

  // FIXED: Updated to consider word states, not just raw capacity score
  const getCapacityColor = (score: number) => {
    // RED PHASE: Due words always take priority (urgent memory preservation)
    if (wordStates.dueWords > 0) return chartColors.performance.poor;

    // YELLOW PHASE: Challenging words present (needs attention before adding new words)
    if (wordStates.strugglingWords > 0) return chartColors.performance.moderate;

    // GREEN PHASE: No urgent items, capacity available
    // Only check raw score when no due or challenging words exist
    if (score >= CAPACITY_THRESHOLDS.READY) return chartColors.performance.excellent;
    if (score >= CAPACITY_THRESHOLDS.CAUTION) return chartColors.performance.moderate;
    return chartColors.performance.poor;
  };

  // FIXED: Updated to use simple capacity labels instead of action messages
  const getReadinessMessage = (): string => {
    if (wordStates.dueWords > 0) {
      return STRINGS.MEMORY_CAPACITY_LOW; // Red phase - low capacity
    }
    if (wordStates.strugglingWords > 0) {
      return STRINGS.MEMORY_CAPACITY_MEDIUM; // Yellow phase - medium capacity
    }
    return STRINGS.MEMORY_CAPACITY_HIGH; // Green phase - high capacity
  };

  // FIXED: Updated to use the corrected color logic
  const getActionCardBackground = (score: number) => {
    const baseColor = getCapacityColor(score);
    return chartColors.withOpacity(baseColor, 0.1); // Light tint of the capacity color
  };

  // Get the score that should be displayed in the center (matches visual gauge)
  const getDisplayScore = (): number => {
    return getVisualScore;
  };

  return {
    memoryMetrics,
    gaugePaths,
    getFilledGradientColors,
    getFilledGradientPositions,
    indicatorPosition,
    getCapacityColor,
    getReadinessMessage,
    getActionCardBackground,
    getDisplayScore,
  };
}

export default useMemoryCapacityGauge;
