import { useQuery } from '@tanstack/react-query';

import { rootEnrichmentQueries } from '@/constants/queries';
import type { RootId } from '@/types/branded.types';
import type { RootEnrichment } from '@/types/rootEnrichment.types';

/**
 * The root explanation for one headword, or `undefined` while it is in flight
 * or if we have never generated one.
 *
 * The two states are deliberately collapsed. Every caller renders nothing in
 * both cases: coverage is a small fraction of the dictionary, so "no entry" is
 * the ordinary outcome, and a surface that distinguished "loading" from "absent"
 * would spend a spinner to announce a gap on most words.
 */
export function useRootEnrichment(rootId: RootId | undefined): RootEnrichment | undefined {
  // `data` only. A rejected query is deliberately not surfaced: the service
  // already logs it at warning level, and every caller renders nothing when the
  // value is absent, so a failure and a word we have no entry for are the same
  // outcome on screen.
  const { data } = useQuery(rootEnrichmentQueries.detail(rootId));
  return data ?? undefined;
}
