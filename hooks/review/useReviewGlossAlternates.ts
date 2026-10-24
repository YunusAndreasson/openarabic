import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { reviewChunkQueries } from '@/constants/queries';
import type { StudyWord } from '@/types/vocabulary.types';
import { createReviewChunkMerger, getReviewChunkQueryInputs } from './useReviewChunkQueryInputs';

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
  return useQueries({
    queries: batchInputs.map(reviewChunkQueries.glossAlternates),
    combine: mergeAlternates,
  });
}

/** See {@link createReviewChunkMerger} for why this is `combine` and module-scoped. */
const mergeAlternates = createReviewChunkMerger<string[]>();
