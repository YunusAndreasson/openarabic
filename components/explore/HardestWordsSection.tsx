import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';

import { SectionLabel } from '@/components/common';
import { rootEnrichmentQueries } from '@/constants/queries';
import { getWordDetailRoute, ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useWordsToRevisit } from '@/hooks/vocabulary/useWordsToRevisit';
import type { StudyWord } from '@/types/vocabulary.types';

import { WordRail } from './WordRail';

/**
 * How many of the ranked leeches reach the rail.
 *
 * `useWordsToRevisit` already caps at `LEECH_LIST_LIMIT` (20), which is a
 * scrollable sheet's worth, not a rail's. Ten cards is roughly four swipes —
 * long enough to feel like a set the learner is working through, short enough
 * that the terminal "see all" card is reachable rather than theoretical. The
 * rest live one tap away in the sheet that owns the full list.
 */
const HARDEST_RAIL_LIMIT = 10;

/**
 * The words the learner keeps forgetting, on the tab they actually land on.
 *
 * This list has existed since the leech ranking shipped, with exactly one way
 * in: a "Revisit" stat tile on Practice that only renders when the count is
 * non-zero. A learner who never scrolls that tab never learns which words are
 * tripping them up — and Explore, the landing tab, carried no vocabulary at all.
 *
 * **It reads the same `useWordsToRevisit` the sheet does**, so the rail and the
 * full list can never disagree about which words qualify, only about how many
 * are shown. That hook filters the shared FSRS cache client-side, so this
 * section costs no network round-trip of its own.
 *
 * **Self-contained** — no props, its own hooks, and outside `useExploreRails`,
 * which only places texts. The Explore screen memoises its header sections against article data,
 * which this has nothing to do with; owning the query here means a cache write
 * re-renders the rail without the screen having to know why.
 *
 * Renders `null` while loading, on error, and when there are no leeches — the
 * house rule for every section on this tab, which has no skeletons and no empty
 * states. A learner with nothing to revisit should see a reading tab.
 */
export function HardestWordsSection(): JSX.Element | null {
  const queryClient = useQueryClient();
  const { leeches, totalCount, isLoading, isError } = useWordsToRevisit();

  if (isLoading || isError || leeches.length === 0) return null;

  const shown = leeches.slice(0, HARDEST_RAIL_LIMIT);

  const handleWordPress = (word: StudyWord) => {
    // Warm the root explanation before the sheet asks for it — the same
    // prefetch-on-tap the dictionary does, and the reason its word screen has
    // the panel painted by the time the push lands. `query`, not the
    // deprecated `prefetchQuery`: same effect (writes into the cache, does not
    // return data to a render), but `prefetchQuery`'s built-in error
    // swallowing has to be done explicitly here instead.
    void queryClient.query(rootEnrichmentQueries.detail(word.root_id)).catch(() => undefined);
    router.push(getWordDetailRoute(word.root_id));
  };

  return (
    <>
      <SectionLabel title={STRINGS.SECTION_HARDEST_WORDS} />
      <WordRail
        words={shown}
        onWordPress={handleWordPress}
        seeAll={
          // Only when the rail actually truncated. Offering to "see all" the ten
          // words already under the finger is a drill-down that leads back to
          // what you just read — the mistake the revisit sheet's own overflow
          // row is written to avoid.
          totalCount > shown.length
            ? {
                count: totalCount,
                onPress: () => router.push(ROUTE_PATHS.PRACTICE_WORDS_TO_REVISIT),
              }
            : undefined
        }
      />
    </>
  );
}

HardestWordsSection.displayName = 'HardestWordsSection';
