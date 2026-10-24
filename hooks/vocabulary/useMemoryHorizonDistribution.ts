import { useMemo } from 'react';

import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  formatHorizon,
  getHorizonBand,
  getHorizonFraction,
  getMemoryHorizonDays,
  HORIZON_BAND_KEYS,
  HORIZON_BAND_LABELS,
  type HorizonBand,
} from '@/utils/memoryHorizon';
import { BIN_COUNT, getHorizonBinIndex, getWordsPerDot } from '@/utils/horizonBandPath';
import { tallyBands } from '@/utils/list';

export interface MemoryHorizonDistribution {
  /** One entry per column, counting the practised words whose horizon falls in it. */
  bins: number[];
  /** Tallest column, before the scale floor is applied. */
  maxBinCount: number;
  /** How many words each drawn dot stands for. Above 1 only for large collections. */
  wordsPerDot: number;
  /** The four named bands, for the axis legend and the spoken description. */
  bands: HorizonBand[];
  /** Median horizon in days, or null when nothing has been practised. */
  medianDays: number | null;
  /** "3 weeks" / "4 months" / "" when there is no median. */
  medianLabel: string;
  /** 0..1 position of the median on the same log axis the bins use. */
  medianFraction: number;
  /** Words with a real memory state behind them. */
  practisedCount: number;
  /** Saved but never reviewed. Named in words, never drawn. */
  notStartedCount: number;
  totalWords: number;
  hasDistribution: boolean;
  /**
   * Every practised word's horizon in days, by word. What lets the
   * constellation tell WHICH dots a review moved, so they can travel to their
   * new column instead of the whole field being redrawn around them.
   */
  horizonByRootId: ReadonlyMap<RootId, number>;
}

const EMPTY_BINS = (): number[] => new Array<number>(BIN_COUNT).fill(0);
const NO_HORIZONS: ReadonlyMap<RootId, number> = new Map();

/**
 * The distribution of memory horizons across a learner's vocabulary, binned onto
 * the log-time axis the constellation draws.
 *
 * Pure `useMemo` over words the practice screen already has — no query, no extra
 * network. It is also the only genuinely new derivation on that screen; the
 * recall-now count comes from the retrievability forecast, which was already
 * being computed and thrown away.
 *
 * Two things this deliberately does NOT do:
 *
 * - It does not gate on `hasBeenPractised` itself. `getMemoryHorizonDays` already
 *   applies that gate (and additionally rejects a null / non-finite / non-positive
 *   stability), so calling it IS the gate. A second copy of the rule is how two
 *   copies drift apart, and this particular rule has bitten twice: a
 *   never-practised word carries PLACEHOLDER FSRS values, not nulls.
 * - It does not include never-practised words as a leading "zero" band. They have
 *   no horizon, which is a different statement from "you would forget them
 *   immediately". They are counted in `notStartedCount` and named in words.
 */
export function useMemoryHorizonDistribution(studyWords: StudyWord[]): MemoryHorizonDistribution {
  return useMemo<MemoryHorizonDistribution>(() => {
    const horizons: number[] = [];
    const horizonByRootId = new Map<RootId, number>();
    for (const word of studyWords) {
      const days = getMemoryHorizonDays(word);
      if (days == null) continue;
      horizons.push(days);
      horizonByRootId.set(word.root_id, days);
    }

    const totalWords = studyWords.length;
    const practisedCount = horizons.length;
    const notStartedCount = totalWords - practisedCount;
    const bands = tallyBands(horizons, HORIZON_BAND_KEYS, HORIZON_BAND_LABELS, getHorizonBand);

    if (practisedCount === 0) {
      return {
        bins: EMPTY_BINS(),
        maxBinCount: 0,
        wordsPerDot: 1,
        bands,
        medianDays: null,
        medianLabel: '',
        medianFraction: 0,
        practisedCount: 0,
        notStartedCount,
        totalWords,
        hasDistribution: false,
        horizonByRootId: NO_HORIZONS,
      };
    }

    const bins = EMPTY_BINS();
    for (const days of horizons) {
      const index = getHorizonBinIndex(days);
      bins[index] = (bins[index] ?? 0) + 1;
    }

    // Median, not mean. FSRS stability is heavily right-skewed — a handful of
    // 300-day words drag a mean somewhere no word in the collection actually
    // sits, which makes it a worse answer to "how long does a typical word of
    // mine hold". (`user_study_stats.avg_stability` exists in the DB types and
    // is exactly the shortcut not to take.)
    const sorted = [...horizons].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const medianDays =
      sorted.length % 2 === 1
        ? (sorted[middle] ?? null)
        : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;

    const maxBinCount = bins.reduce((max, count) => Math.max(max, count), 0);

    return {
      bins,
      maxBinCount,
      wordsPerDot: getWordsPerDot(maxBinCount),
      bands,
      medianDays,
      medianLabel: formatHorizon(medianDays),
      medianFraction: getHorizonFraction(medianDays),
      practisedCount,
      notStartedCount,
      totalWords,
      hasDistribution: true,
      horizonByRootId,
    };
  }, [studyWords]);
}
