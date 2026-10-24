import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { tallyBands } from '@/utils/list';
import {
  DEPTH_BAND_KEYS,
  DEPTH_BAND_LABELS,
  getDepthBandForReps,
  getWordReps,
  type DepthBand,
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
 * come from one clamped read of one column. (The practice screen derives its tile the
 * same way, from the same `getWordReps` clamp.)
 */
export function useReviewDepthDistribution(studyWords: StudyWord[]): ReviewDepthDistribution {
  return useMemo<ReviewDepthDistribution>(() => {
    // One clamp per word, and the band read off the clamped count —
    // `getWordDepthBand` would re-read and re-clamp `fsrs_reps` for the same row.
    const reps = studyWords.map(getWordReps);
    const bands = tallyBands(reps, DEPTH_BAND_KEYS, DEPTH_BAND_LABELS, getDepthBandForReps);

    return {
      bands,
      maxBandCount: bands.reduce(
        (max, band) => (band.key === 'none' ? max : Math.max(max, band.count)),
        0,
      ),
      totalReviews: reps.reduce((sum, count) => sum + count, 0),
      reviewedWords: reps.filter(count => count > 0).length,
      totalWords: studyWords.length,
    };
  }, [studyWords]);
}
