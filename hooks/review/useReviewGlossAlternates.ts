import { skipToken, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sentencesService } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  getReviewChunkQueryInputs,
  REVIEW_CHUNK_STALE_TIME_MS,
} from './useReviewChunkQueryInputs';

/**
 * Every English name the corpus gives each word in the current review chunk,
 * fetched once for the whole chunk.
 *
 * Feeds `matchSingleWord`'s `alternates`, which is what stops voice grading
 * failing a learner who answers "gathering" to a card whose gloss happens to
 * say "assembly". Same shape and same rules as `useReviewExamples`: one bounded
 * query per admitted batch so the per-card path stays at zero network calls,
 * no retry, and completely non-blocking — a session runs perfectly well
 * without it, just with the narrower single-gloss grading it has always had.
 */
export function useReviewGlossAlternates(
  enrichmentBatches: readonly (readonly StudyWord[])[],
): Map<number, string[]> {
  const batchInputs = useMemo(
    () => enrichmentBatches.map(getReviewChunkQueryInputs),
    [enrichmentBatches],
  );
  const queries = useQueries({
    queries: batchInputs.map(({ rootIds, keySignature }) => ({
      queryKey: ['review', 'glossAlternates', keySignature],
      queryFn:
        rootIds.length > 0
          ? () => sentencesService.getGlossAlternatesForRoots(rootIds)
          : skipToken,
      staleTime: REVIEW_CHUNK_STALE_TIME_MS,
      // Widening the accepted answers is a bonus, not a requirement; retrying
      // costs a session more requests than the feature is worth.
      retry: false,
    })),
  });

  return useMemo(() => {
    if (queries.every(query => !query.data)) return EMPTY_ALTERNATES;
    const merged = new Map<number, string[]>();
    for (const query of queries) {
      if (!query.data) continue;
      for (const [rootId, alternates] of query.data) merged.set(rootId, alternates);
    }
    return merged;
  }, [queries]);
}

/** Stable identity so consumers don't re-render while the query is in flight. */
const EMPTY_ALTERNATES = new Map<number, string[]>();
