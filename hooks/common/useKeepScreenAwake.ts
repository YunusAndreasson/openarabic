import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useId } from 'react';

import { breadcrumb } from '@/utils/errorHandling';

/**
 * Hold the display on for as long as this component is mounted and `active`.
 *
 * Reading Arabic and answering a review card are slow, deliberate work with
 * long gaps between touches — a learner parsing a sentence, tapping a word,
 * recalling a meaning — and the OS counts every one of those gaps as idle. On
 * the default timeout the screen dimmed and locked partway through.
 *
 * **What this adds over `useKeepAwake` from expo-keep-awake: `active`, and
 * nothing else.** The lock has to be releasable without unmounting, because the
 * screen holding it is not always the screen being read — the review route also
 * renders the completion summary, and a finished session left on the table
 * would otherwise keep the display lit until the learner came back and closed
 * it. `useKeepAwake` has no such input.
 *
 * The per-instance `useId()` tag below is NOT an addition — it is a copy of
 * what `useKeepAwake` already does with no `tag` argument (see
 * expo-keep-awake/src/index.ts: `const defaultTag = useId()`). It is spelled
 * out here only because this hook has its own effect and needs its own tag.
 *
 * It matters either way, so do not "simplify" it to a literal. `ExpoKeepAwakeManager`
 * keeps tags in a `mutableSetOf<String>`, NOT a counter, and clears
 * `FLAG_KEEP_SCREEN_ON` as soon as `tags.size == 1 && tags.contains(tag)`. Two
 * mounted screens sharing one literal are therefore a single set entry, and the
 * first to unmount drops the lock out from under the other. That is a live path
 * in this app, not a hypothetical: `ArticleContent`'s footer renders
 * `RelatedArticlesSection`, whose `RelatedArticlesByFilter` does
 * `router.push(getArticleRoute(...))`, so article B stacks on top of a
 * still-mounted article A. Passing an explicit shared tag is exactly the bug
 * this hook shipped with on its first draft, and it was reproduced on device
 * against the real native module before being fixed.
 *
 * Deliberately not the default `ExpoKeepAwakeTag` either: `expo`'s own
 * `withDevTools` holds that one app-wide in development, so reusing it would
 * mean a screen unmounting here released Expo's dev lock too.
 *
 * The lock is released on unmount, and the OS idle timer only runs while the
 * app is foregrounded, so backgrounding needs no separate handling.
 */
export function useKeepScreenAwake(active = true): void {
  const tag = useId();

  useEffect(() => {
    if (!active) return;
    // Neither call is allowed to take down the screen the learner is reading, so
    // both rejections are swallowed — but they are NOT silent. A failed
    // `deactivate` is the expensive one: ExpoKeepAwakeManager reads
    // `currentActivity` (which throws once the app context is gone) BEFORE
    // `tags.remove(tag)`, so a throw leaves a phantom tag in the set forever.
    // `isActivated` then stays true, every later `activate` skips
    // `addFlags(FLAG_KEEP_SCREEN_ON)` on the new activity's window, and no
    // screen in the app ever holds the display again. Swallowing that with no
    // trace would leave nothing to diagnose it from.
    activateKeepAwakeAsync(tag).catch((error: unknown) => {
      breadcrumb(
        'preloader',
        'keepAwake.activate.failed',
        { tag, error: String(error) },
        'warning',
      );
    });
    return () => {
      deactivateKeepAwake(tag).catch((error: unknown) => {
        breadcrumb(
          'preloader',
          'keepAwake.deactivate.failed',
          // Flagged as the sticky one: from here on the app cannot hold the
          // display at all, and nothing else will report that.
          { tag, error: String(error), sticky: true },
          'warning',
        );
      });
    };
  }, [active, tag]);
}
