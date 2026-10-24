import type { UseQueryResult } from '@tanstack/react-query';

import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

export interface ReviewChunkQueryInputs {
  rootIds: RootId[];
  keySignature: string;
}

/**
 * Stable query identity for data fetched once per immutable review batch.
 * Sorting also makes equivalent reconstructed batches hit the same cache key.
 */
export function getReviewChunkQueryInputs(wordBatch: readonly StudyWord[]): ReviewChunkQueryInputs {
  const rootIds = [...new Set(wordBatch.map(word => word.root_id))].sort((a, b) => a - b);
  return { rootIds, keySignature: rootIds.join(',') };
}

/**
 * Builds the `combine` for a per-batch review query whose results are maps
 * keyed by root id: every batch merged into one map.
 *
 * This is `useQueries`' `combine` rather than a `useMemo` over the returned
 * array, because that array is rebuilt on every render (v5 maps each result
 * through `trackResult()`), so a `useMemo` keyed on it never hits — it would
 * re-merge every batch and hand back a fresh Map identity on every render of
 * the review screen. `combine` is memoized by TanStack on the results
 * themselves.
 *
 * Call it at module scope so the returned function's identity is stable;
 * TanStack re-runs `combine` when the function changes as well as when the
 * results do. The one empty map it closes over is the stable identity
 * consumers see while nothing has arrived.
 */
export function createReviewChunkMerger<T>(): (
  results: UseQueryResult<Map<number, T>>[],
) => Map<number, T> {
  const empty = new Map<number, T>();
  return results => {
    if (results.every(result => !result.data)) return empty;
    const merged = new Map<number, T>();
    for (const result of results) {
      if (!result.data) continue;
      for (const [rootId, value] of result.data) merged.set(rootId, value);
    }
    return merged;
  };
}
