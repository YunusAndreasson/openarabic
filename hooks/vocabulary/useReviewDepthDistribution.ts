import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import {
  DEPTH_BAND_KEYS,
  DEPTH_BAND_LABELS,
  getDepthBandForReps,
  getWordReps,
  type DepthBand,
  type DepthBandKey,
} from '@/utils/practiceDepth';

export interface ReviewDepthDistribution {
  /**
   * The five bands in `DEPTH_BAND_KEYS` order — least-practised first, with
   * `none` last. Always all five, counts included.
   *
   * Stated rather than left to the constant because callers use it to decide
   * whether they need to re-sort, and this comment said "most-practised first"
   * for a while after the constant was inverted.
   */
  bands: DepthBand[];
  /**
   * Tallest DRAWN band, so the row meters share one scale.
   *
   * `none` is excluded. Those words have no practice behind them and the sheet
   * gives them no meter, so scaling the others against them would measure every
   * drawn bar against a bar that is not there — on a young account, where "Not
   * yet" is usually the largest group by far, that flattens the whole chart to
   * near-nothing. Same rule, and the same reason, as
   * `useMemoryHorizonDistribution` keeping `notStartedCount` off its axis.
   */
  maxBandCount: number;
  /** Σ fsrs_reps — the same number the practice tile shows. */
  totalReviews: number;
  /** Words with at least one review behind them. */
  reviewedWords: number;
  totalWords: number;
}

/**
 * The distribution behind the "Reviews done" tile: how many words sit at each
 * depth of practice, and the total those reps sum to.
 *
 * Pure `useMemo` over words the sheet already has — no query, no network. It
 * computes the total ITSELF rather than taking it as a prop, which is what
 * makes the sheet's headline and its rows provably the same measurement: both
 * come from one pass over one column. (The practice screen derives its tile the
 * same way, from the same `getWordReps` clamp.)
 */
export function useReviewDepthDistribution(studyWords: StudyWord[]): ReviewDepthDistribution {
  return useMemo<ReviewDepthDistribution>(() => {
    const bandCounts: Record<DepthBandKey, number> = {
      deep: 0,
      solid: 0,
      few: 0,
      once: 0,
      none: 0,
    };

    let totalReviews = 0;
    let reviewedWords = 0;

    for (const word of studyWords) {
      // One clamp, one band lookup, per word — `getWordDepthBand` would re-read
      // and re-clamp `fsrs_reps` a second time for the same row.
      const reps = getWordReps(word);
      totalReviews += reps;
      if (reps > 0) reviewedWords += 1;
      bandCounts[getDepthBandForReps(reps)] += 1;
    }

    const bands = DEPTH_BAND_KEYS.map(key => ({
      key,
      label: DEPTH_BAND_LABELS[key],
      count: bandCounts[key],
    }));

    return {
      bands,
      maxBandCount: bands.reduce(
        (max, band) => (band.key === 'none' ? max : Math.max(max, band.count)),
        0,
      ),
      totalReviews,
      reviewedWords,
      totalWords: studyWords.length,
    };
  }, [studyWords]);
}
