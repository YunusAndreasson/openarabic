import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

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

    const recentWords = validWords.filter(word => {
      if (!word.created_at) return false;
      const wordDate = new Date(word.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return wordDate >= weekAgo;
    });

    const trend = recentWords.length > 0 && averageReps > 2 ? 'improving' : 'stable';

    return {
      capacityScore: Math.max(15, Math.min(100, capacityScore)),
      trend,
    };
  }, [studyWords]);

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

    const filledSweep = (memoryMetrics.capacityScore / 100) * totalSweep;
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
  }, [memoryMetrics.capacityScore, width, height, radius]);

  const getFilledGradientColors = (score: number): string[] => {
    const baseColors = [
      chartColors.performance.poor ?? colors.error,
      chartColors.performance.moderate ?? colors.warning,
      chartColors.performance.good ?? colors.info,
      chartColors.performance.excellent ?? colors.success,
    ];

    if (score <= 30) {
      return [baseColors[0] as string, baseColors[1] as string];
    }
    if (score <= 70) {
      return [baseColors[0] as string, baseColors[1] as string, baseColors[2] as string];
    }
    return baseColors;
  };

  const getFilledGradientPositions = (score: number): number[] => {
    if (score <= 30) {
      return [0, 1];
    }
    if (score <= 70) {
      return [0, 30 / score, 1];
    }
    return [0, 30 / score, 70 / score, 1];
  };

  const indicatorPosition = useMemo<IndicatorPosition>(() => {
    const centerX = width / 2;
    const centerY = height - 15;

    const angle = 185 - (memoryMetrics.capacityScore / 100) * 170;
    const angleRad = (angle * Math.PI) / 180;

    const indicatorRadius = radius - strokeWidth / 2;
    const x = centerX + Math.cos(angleRad) * indicatorRadius;
    const y = centerY + Math.sin(angleRad) * indicatorRadius;

    return { x, y, angle };
  }, [memoryMetrics.capacityScore, width, height, radius, strokeWidth]);

  const getCapacityColor = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.READY) return chartColors.performance.excellent; // Green
    if (score >= CAPACITY_THRESHOLDS.CAUTION) return chartColors.performance.moderate; // Yellow/Orange
    return chartColors.performance.poor; // Red
  };

  const getReadinessMessage = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.READY) return STRINGS.READY_TO_ADD;
    if (score >= CAPACITY_THRESHOLDS.CAUTION) return STRINGS.ADD_WITH_CAUTION;
    return STRINGS.DONT_ADD_WORDS;
  };

  const getActionCardBackground = (score: number) => {
    const baseColor = getCapacityColor(score);
    return chartColors.withOpacity(baseColor, 0.1); // Light tint of the capacity color
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
  };
}

export default useMemoryCapacityGauge;
