import { skipToken, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { sentencesService, type WordExample } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';
import { getReviewChunkQueryInputs, REVIEW_CHUNK_STALE_TIME_MS } from './useReviewChunkQueryInputs';

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
  // It is `useQueries`' `combine` rather than a `useMemo` over the returned
  // array: that array is rebuilt on every render (v5 maps each result through
  // `trackResult()`), so a `useMemo` keyed on it never hits and the whole
  // precompute would land in render — on every voice-phase tick, audio-status
  // change and progress update of a live session — handing back fresh
  // `WordExample` objects each time and re-rendering the card with them.
  // TanStack memoizes `combine` on the results, so the work now happens once
  // per batch arrival.
  //
  // `useCallback` is required rather than incidental: TanStack re-runs `combine`
  // when the function identity changes, so an inline arrow would reintroduce the
  // very problem this fixes. `useColors` returns a stable object per theme.
  const combineExamples = useCallback(
    (results: UseQueryResult<Map<number, WordExample>>[]): Map<number, WordExample> => {
      if (results.every(result => !result.data)) return EMPTY_EXAMPLES;
      const colored = new Map<number, WordExample>();
      for (const result of results) {
        if (!result.data) continue;
        for (const [rootId, example] of result.data) {
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
    },
    [colors],
  );

  return useQueries({
    queries: batchInputs.map(({ rootIds, keySignature }) => ({
      queryKey: ['review', 'examples', keySignature],
      queryFn: rootIds.length > 0 ? () => sentencesService.getExamplesForRoots(rootIds) : skipToken,
      staleTime: REVIEW_CHUNK_STALE_TIME_MS,
      // A missing example is cosmetic; retrying costs a session more requests
      // than the feature is worth.
      retry: false,
    })),
    combine: combineExamples,
  });
}

/** Stable identity so consumers don't re-render on every miss. */
const EMPTY_EXAMPLES = new Map<number, WordExample>();
