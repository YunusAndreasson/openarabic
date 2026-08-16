import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { sentencesService } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';

/** Cached for the app session, like the examples alongside it: the corpus is
 *  static content, so a chunk's glosses cannot go stale mid-session. */
const ALTERNATES_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Every English name the corpus gives each word in the current review chunk,
 * fetched once for the whole chunk.
 *
 * Feeds `matchSingleWord`'s `alternates`, which is what stops voice grading
 * failing a learner who answers "gathering" to a card whose gloss happens to
 * say "assembly". Same shape and same rules as `useReviewExamples`: one bounded
 * query at chunk start so the per-card path stays at zero network calls, no
 * retry, and completely non-blocking — a session runs perfectly well without
 * it, just with the narrower single-gloss grading it has always had.
 */
export function useReviewGlossAlternates(wordQueue: StudyWord[]): Map<number, string[]> {
  // Sorted + joined so the key is stable against queue reordering — the spacing
  // queue reshuffles constantly as words are drilled, and every requeue would
  // otherwise look like a new chunk and refetch.
  const rootIds = useMemo(
    () => [...new Set(wordQueue.map(w => w.root_id))].sort((a, b) => a - b),
    [wordQueue],
  );

  const query = useQuery({
    queryKey: ['review', 'glossAlternates', rootIds.join(',')],
    queryFn:
      rootIds.length > 0 ? () => sentencesService.getGlossAlternatesForRoots(rootIds) : skipToken,
    staleTime: ALTERNATES_STALE_TIME_MS,
    // Widening the accepted answers is a bonus, not a requirement; retrying
    // costs a session more requests than the feature is worth.
    retry: false,
  });

  return query.data ?? EMPTY_ALTERNATES;
}

/** Stable identity so consumers don't re-render while the query is in flight. */
const EMPTY_ALTERNATES = new Map<number, string[]>();
