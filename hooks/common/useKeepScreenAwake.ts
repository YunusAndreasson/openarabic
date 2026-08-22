import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useId } from 'react';

/**
 * Hold the display on for as long as this component is mounted and `active`.
 *
 * Reading Arabic and answering a review card are slow, deliberate work with
 * long gaps between touches — a learner parsing a sentence, tapping a word,
 * recalling a meaning — and the OS counts every one of those gaps as idle. On
 * the default timeout the screen dimmed and locked partway through.
 *
 * Two things this adds over calling `useKeepAwake` from expo-keep-awake
 * directly, both of which it got wrong first:
 *
 * 1. **`active`.** The lock has to be releasable without unmounting, because
 *    the screen holding it is not always the screen being read: the review
 *    route also renders the completion summary, and a finished session left on
 *    the table would otherwise keep the display lit until the learner came back
 *    and closed it. `useKeepAwake` has no such input.
 *
 * 2. **A per-instance tag, never a shared literal.** `ExpoKeepAwakeManager`
 *    keeps tags in a `mutableSetOf<String>`, NOT a counter, and clears
 *    `FLAG_KEEP_SCREEN_ON` as soon as `tags.size == 1 && tags.contains(tag)`.
 *    Two mounted screens sharing one tag are therefore a single set entry, and
 *    the first to unmount drops the lock out from under the other. That is a
 *    live path in this app, not a hypothetical: `ArticleContent`'s footer
 *    renders `RelatedArticlesSection`, whose `RelatedArticlesByFilter` does
 *    `router.push(getArticleRoute(...))` — so article B stacks on top of a
 *    still-mounted article A, and backing out of B would have unlocked A's
 *    screen mid-read. `useId()` gives every instance its own entry, so the set
 *    only empties when the last reader leaves.
 *
 * The lock is released on unmount, and the OS idle timer only runs while the
 * app is foregrounded, so backgrounding needs no separate handling.
 *
 * Deliberately NOT the default `ExpoKeepAwakeTag`: `expo`'s own `withDevTools`
 * holds that one app-wide in development, and reusing it would mean a screen
 * unmounting here released Expo's dev lock too.
 */
export function useKeepScreenAwake(active = true): void {
  const tag = useId();

  useEffect(() => {
    if (!active) return;
    // Rejections are swallowed rather than surfaced: the display timeout is a
    // comfort, and a device that refuses the lock (or an activity that has gone
    // away underneath it) is not a reason to take down the screen the learner
    // is reading.
    activateKeepAwakeAsync(tag).catch(() => null);
    return () => {
      deactivateKeepAwake(tag).catch(() => null);
    };
  }, [active, tag]);
}
