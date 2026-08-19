import { skipToken, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { sentencesService, type WordExample } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';
import {
  getReviewChunkQueryInputs,
  REVIEW_CHUNK_STALE_TIME_MS,
} from './useReviewChunkQueryInputs';

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
  const queries = useQueries({
    queries: batchInputs.map(({ rootIds, keySignature }) => ({
      queryKey: ['review', 'examples', keySignature],
      queryFn:
        rootIds.length > 0 ? () => sentencesService.getExamplesForRoots(rootIds) : skipToken,
      staleTime: REVIEW_CHUNK_STALE_TIME_MS,
      // A missing example is cosmetic; retrying costs a session more requests
      // than the feature is worth.
      retry: false,
    })),
  });

  // Grammar colouring, resolved from fetched batches rather than per card — the same
  // load-time precompute the reader does in `useSentencesByWord`. `useColors`
  // returns a stable object per theme, so this recomputes on a theme change and
  // on nothing else; `analyzeArabicWord`'s cache absorbs repeated forms across
  // sentences. Doing it in render would put ~200 analyses on the card's path.
  return useMemo(() => {
    if (queries.every(query => !query.data)) return EMPTY_EXAMPLES;
    const colored = new Map<number, WordExample>();
    for (const query of queries) {
      if (!query.data) continue;
      for (const [rootId, example] of query.data) {
        colored.set(rootId, {
          ...example,
          words: example.words.map(word => ({
            ...word,
            coloredSegments: computeColoredSegments(word.wordForm, word.english, colors),
          })),
        });
      }
    }
    return colored;
  }, [queries, colors]);
}

/** Stable identity so consumers don't re-render on every miss. */
const EMPTY_EXAMPLES = new Map<number, WordExample>();
