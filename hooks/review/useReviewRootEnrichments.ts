import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { reviewChunkQueries } from '@/constants/queries';
import type { RootEnrichment } from '@/types/rootEnrichment.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { createReviewChunkMerger, getReviewChunkQueryInputs } from './useReviewChunkQueryInputs';

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
    queries: batchInputs.map(reviewChunkQueries.rootEnrichments),
    combine: mergeRootEnrichments,
  });
}

const mergeRootEnrichments = createReviewChunkMerger<RootEnrichment>();
