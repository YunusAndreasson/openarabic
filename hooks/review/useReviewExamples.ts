import { useQueries } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { reviewChunkQueries } from '@/constants/queries';
import { useColors } from '@/hooks/theme/useColors';
import type { WordExample } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';
import { createReviewChunkMerger, getReviewChunkQueryInputs } from './useReviewChunkQueryInputs';

/**
 * One example sentence per word in the current review chunk, fetched once.
 *
 * Why a chunk-level prefetch rather than `useSentencesByWord` per card: the
 * review lane should not make calls on the per-card path. One bounded query for
 * each immutable working-set batch keeps that property while still supporting
 * sessions whose backlog refills beyond the first chunk.
 *
 * Deliberately non-blocking. The session never waits on this: cards render
 * without an example and gain one the moment it arrives. An outright failure is
 * silent — a missing example is a smaller loss than a blocked session.
 */
export function useReviewExamples(
  enrichmentBatches: readonly (readonly StudyWord[])[],
): Map<number, WordExample> {
  const colors = useColors();

  const batchInputs = useMemo(
    () => enrichmentBatches.map(getReviewChunkQueryInputs),
    [enrichmentBatches],
  );
  // Grammar colouring, resolved from fetched batches rather than per card — the
  // same load-time precompute the reader does in `useSentencesByWord`.
  // `analyzeArabicWord`'s cache absorbs repeated forms across sentences, but
  // this is still ~200 analyses per chunk, so it must run when the data or the
  // theme changes and at no other time.
  //
  // Transform each batch in its query observer's cached `select`, before the
  // session-wide merge. Coloring inside `combine` reprocessed every earlier
  // batch on each refill and query notification, so a growing session paid
  // repeatedly for examples it had already colored. Existing observers keep
  // their selected examples when another batch joins the session.
  //
  // `useCallback` is required rather than incidental: TanStack re-runs `select`
  // when the function identity changes, so an inline arrow would reintroduce the
  // very problem this fixes. `useColors` returns a stable object per theme.
  const colorExamples = useCallback(
    (examples: Map<number, WordExample>): Map<number, WordExample> => {
      const colored = new Map<number, WordExample>();
      for (const [rootId, example] of examples) {
        colored.set(rootId, {
          ...example,
          words: example.words.map(word => ({
            ...word,
            coloredSegments: computeColoredSegments(word.wordForm, word.english, colors),
          })),
        });
      }
      return colored;
    },
    [colors],
  );

  return useQueries({
    queries: batchInputs.map(input => ({
      ...reviewChunkQueries.examples(input),
      select: colorExamples,
    })),
    combine: mergeExamples,
  });
}

/** Stable merge identity; coloring is cached separately for each batch. */
const mergeExamples = createReviewChunkMerger<WordExample>();
