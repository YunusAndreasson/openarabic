import { TransparentHeaderButton } from '@/components/ui';
import { router } from 'expo-router';
import { useCallback, type JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * The Explore tab's `headerRight` — opens the search screen.
 *
 * Lives here rather than in `components/ui` because it reaches into the router,
 * which a `components/ui` primitive must not: those are driveable entirely by
 * their props. Same reason as `components/practice/DictionaryButton`.
 *
 * Imported by direct path rather than through `components/explore/index.ts`,
 * and deliberately absent from it: the Explore *layout* renders this button, and
 * routing it through the barrel would pull every explore component — Skia
 * charts included — into the layout's module graph to draw one glyph.
 * `components/practice/DictionaryButton` is kept out of its barrel for the same
 * reason.
 *
 * A glyph in the trailing slot is an exception to the convention documented on
 * `createTabHeaderOptions` — that slot is otherwise the screen's primary action
 * spelled as words, and icon-only controls sit leading. A magnifier earns it:
 * it is the one icon every platform has already taught people to read, and the
 * top right is where they reach for it.
 */
export function ExploreSearchButton(): JSX.Element {
  const handlePressAction = useCallback(() => router.push(ROUTE_PATHS.EXPLORE_SEARCH), []);

  return (
    <TransparentHeaderButton
      accessibilityLabel={STRINGS.SEARCH_TEXTS_A11Y}
      icon="search"
      onPress={handlePressAction}
    />
  );
}
