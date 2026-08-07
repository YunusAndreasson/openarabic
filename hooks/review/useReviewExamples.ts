import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { sentencesService, type WordExample } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';

/** Cached for the app session: the corpus is static content, so a chunk's
 *  examples never go stale mid-session and re-entering Practice reuses them. */
const EXAMPLES_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * One example sentence per word in the current review chunk, fetched once.
 *
 * Why a chunk-level prefetch rather than `useSentencesByWord` per card: the
 * review lane must not make network calls while a session is running (a warm
 * session is measurably `net: 0`, and the debug HUD flags any download). One
 * bounded query at session start keeps that property while still giving every
 * card its context.
 *
 * Deliberately non-blocking. The session never waits on this: cards render
 * without an example and gain one the moment it arrives. An outright failure is
 * silent — a missing example is a smaller loss than a blocked session.
 */
export function useReviewExamples(wordQueue: StudyWord[]): Map<number, WordExample> {
  // Sorted + joined so the key is stable against queue reordering (the spacing
  // queue reshuffles constantly as words are drilled) — otherwise every requeue
  // would look like a new chunk and refetch.
  const rootIds = useMemo(
    () => [...new Set(wordQueue.map(w => w.root_id))].sort((a, b) => a - b),
    [wordQueue],
  );

  const keySignature = rootIds.join(',');

  const query = useQuery({
    queryKey: ['review', 'examples', keySignature],
    queryFn: rootIds.length > 0 ? () => sentencesService.getExamplesForRoots(rootIds) : skipToken,
    staleTime: EXAMPLES_STALE_TIME_MS,
    // A missing example is cosmetic; retrying costs a session more requests
    // than the feature is worth.
    retry: false,
  });

  return query.data ?? EMPTY_EXAMPLES;
}

/** Stable identity so consumers don't re-render on every miss. */
const EMPTY_EXAMPLES = new Map<number, WordExample>();
