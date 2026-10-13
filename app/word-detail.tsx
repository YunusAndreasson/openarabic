import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';

import { WordDetailContent } from '@/components/practice/WordDetailContent';
import type { RootId } from '@/types/branded.types';

/**
 * One saved word, as a sheet that can present over any tab.
 *
 * **Why this is a route and not a `<BottomSheet>` on the Explore screen.** The
 * app has exactly three gorhom sheet instances and they are all owned by a
 * screen that can host one; Explore cannot. Its container is a plain
 * `ScrollView`, and gorhom's sheet is `position: absolute; top: 0`, which
 * resolves against the nearest parent — inside a scroll view that is the top of
 * the *content*, so the sheet sizes to the full scroll height and scrolls away
 * with the page. Everything else in this app that looks like a sheet is a
 * `presentation: 'formSheet'` route, and so is this.
 *
 * **Why not `/(tabs)/practice/word`.** That screen answers the same question and
 * answers more of it, but it lives inside the practice stack by design, so
 * opening it from Explore means changing tabs before the learner has seen
 * anything. This sheet carries what a glance is for — how well the word is held,
 * when it comes back, where it comes from — and hands off to that screen for the
 * examples and the destructive actions.
 *
 * All the actual layout — hero, memory panel, FSRS stats, root family — lives in
 * `WordDetailContent`, shared with the inline detail view `words-to-revisit`
 * swaps in over its own list. This route is just that content plus the param
 * parsing a real deep link needs.
 */
export default function WordDetailSheet(): JSX.Element {
  const { rootId: rootIdParam } = useLocalSearchParams<{ rootId?: string }>();
  const rootId = Number(rootIdParam) as RootId;
  // The route is reachable by a real external deep link, unlike the practice
  // word screen (always pushed with a known-good id) — a missing or malformed
  // param needs a distinct message from "removed from another screen", not the
  // same WORD_NOT_FOUND claim about a link that never carried a valid id.
  const hasValidRootId = Number.isSafeInteger(rootId) && rootId > 0;

  return <WordDetailContent hasValidRootId={hasValidRootId} rootId={rootId} />;
}
