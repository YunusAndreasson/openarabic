import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';

/** Static review enrichment stays fresh for the lifetime of an app session. */
export const REVIEW_CHUNK_STALE_TIME_MS = MILLISECONDS_PER_HOUR;

export interface ReviewChunkQueryInputs {
  rootIds: RootId[];
  keySignature: string;
}

/**
 * Stable query identity for data fetched once per immutable review batch.
 * Sorting also makes equivalent reconstructed batches hit the same cache key.
 */
export function getReviewChunkQueryInputs(
  wordBatch: readonly StudyWord[],
): ReviewChunkQueryInputs {
  const rootIds = [...new Set(wordBatch.map(word => word.root_id))].sort((a, b) => a - b);
  return { rootIds, keySignature: rootIds.join(',') };
}
