import { skipToken, useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { rootEnrichmentService } from '@/services/rootEnrichment';
import type { RootEnrichment } from '@/types/rootEnrichment.types';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  createReviewChunkMerger,
  getReviewChunkQueryInputs,
  REVIEW_CHUNK_STALE_TIME_MS,
} from './useReviewChunkQueryInputs';

/**
 * Root stories for every word admitted to the review session, fetched once per
 * immutable scheduler batch so a failed card never starts its own request.
 *
 * Missing enrichment is ordinary and silent. The answer face keeps its example
 * sentence in that case, so this supplementary teaching moment can never hold
 * up or hollow out a review.
 */
export function useReviewRootEnrichments(
  enrichmentBatches: readonly (readonly StudyWord[])[],
): Map<number, RootEnrichment> {
  const batchInputs = useMemo(
    () => enrichmentBatches.map(getReviewChunkQueryInputs),
    [enrichmentBatches],
  );

  return useQueries({
    queries: batchInputs.map(({ rootIds, keySignature }) => ({
      queryKey: ['review', 'rootEnrichments', keySignature],
      queryFn: rootIds.length > 0 ? () => rootEnrichmentService.getByRootIds(rootIds) : skipToken,
      staleTime: REVIEW_CHUNK_STALE_TIME_MS,
      retry: false,
    })),
    combine: mergeRootEnrichments,
  });
}

const mergeRootEnrichments = createReviewChunkMerger<RootEnrichment>();
