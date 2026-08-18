import { useMemo } from 'react';

import { DAYS_7 } from '@/constants/chartConstants';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateRetrievabilityForecast } from '@/utils/fsrsUtils';

export interface MemoryInsights {
  currentRetrievability: number;
  /** Forecast average retrievability at the end of the window (no reviews) */
  weekRetrievability: number;
  criticalWords: number;
  /**
   * How many more words drop below the critical recall threshold by the end of
   * the window if nothing is reviewed. The forgetting curve only decreases, so
   * this is never negative.
   */
  criticalWordsInWeek: number;
  /**
   * Expected number of words recallable right now — the sum of every measured
   * word's recall probability, which is `currentRetrievability` un-averaged.
   *
   * Deliberately derived from the same figures as `currentRetrievability` so
   * the practice hero's count and the memory sheet's percentage are the same
   * fact in two units and can never drift apart.
   */
  recallableWords: number;
  /**
   * How many words the percentage is actually averaged over — only those with
   * a review behind them. A word that has never been shown has no memory
   * state to decay, so it cannot be in this average, and the surfaces above
   * must not imply it is. Zero here means there is nothing to measure yet,
   * which is NOT the same as 0% recall.
   */
  measuredWords: number;
}

/**
 * Handed back by identity to every caller on the empty path, so it is frozen:
 * the non-empty branch builds a fresh object each time, and one shared mutable
 * object would make the two branches behave differently — a write on the empty
 * one reaching Practice, the due-words sheet and the harness at once, with a
 * reference that never changes to signal it.
 */
const EMPTY_INSIGHTS: MemoryInsights = Object.freeze({
  currentRetrievability: 0,
  weekRetrievability: 0,
  criticalWords: 0,
  criticalWordsInWeek: 0,
  recallableWords: 0,
  measuredWords: 0,
});

/**
 * Reads the 7-day forgetting-curve forecast as a handful of plain numbers: how
 * much is recallable now, how much slips by the end of the window.
 *
 * This was `useRetrievabilityChart`, and it also built a smooth Skia path, the
 * data-point positions for it, and a set of coloured performance zones. No
 * caller ever read any of them — the retrievability line was retired when the
 * memory horizon band replaced it, and only the numbers outlived the chart. The
 * path build ran on every Practice render, and the zones pulled in a theme
 * subscription that re-ran the whole forecast on a light/dark switch.
 */
export function useMemoryInsights(studyWords: StudyWord[]): MemoryInsights {
  const retrievabilityData = useMemo(
    () => calculateRetrievabilityForecast(studyWords, DAYS_7),
    [studyWords],
  );

  return useMemo<MemoryInsights>(() => {
    if (retrievabilityData.length === 0) return EMPTY_INSIGHTS;

    // Today (leftmost, in UTC) and the far end of the forecast window — where
    // memory lands if nothing is reviewed.
    const todayData = retrievabilityData[0];
    const weekData = retrievabilityData[retrievabilityData.length - 1];

    const currentRetrievability = todayData?.averageRetrievability || 0;
    const criticalWords = todayData?.criticalWords || 0;
    const weekRetrievability = weekData?.averageRetrievability || 0;

    // Only words with a review behind them carry a memory state, so they are
    // the only ones the forgetting curve can speak for.
    const measuredWords = todayData?.wordCount ?? 0;

    // Σ R over measured words. Computed from the UNROUNDED average so it stays
    // the same quantity the gauge shows, and clamped so it can never claim more
    // recallable words than there are words to recall.
    const recallableWords = Math.min(
      measuredWords,
      Math.round((currentRetrievability / 100) * measuredWords),
    );

    // How many more words slip below the critical line across the window.
    // Max(0, …) is defensive only: retrievability decays monotonically, so the
    // week's critical count can never be lower than today's.
    const criticalWordsInWeek = Math.max(0, (weekData?.criticalWords ?? 0) - criticalWords);

    return {
      currentRetrievability: Math.round(currentRetrievability),
      weekRetrievability: Math.round(weekRetrievability),
      criticalWords,
      criticalWordsInWeek,
      recallableWords,
      measuredWords,
    };
  }, [retrievabilityData]);
}
