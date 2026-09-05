import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * How the bottom tab bar gets out of the way while a tab root is scrolled.
 *
 * Two different mechanisms, because the platforms disagree about who owns the
 * gesture:
 *
 * - **iOS 26+** does this natively. `NativeTabs` takes `minimizeBehavior`
 *   ("onScrollDown"), UIKit observes the screen's primary scroll view itself,
 *   and the bar shrinks to a pill rather than vanishing. Nothing in this file
 *   runs there — see `app/(tabs)/_layout.tsx`.
 * - **Android** has no equivalent: Material's `BottomNavigationView` never
 *   reacts to scrolling, and `react-native-screens` exposes only a boolean
 *   (`tabBarHidden`) with no animation of its own. So the direction is read in
 *   JS here and the bar is shown/hidden outright.
 *
 * The store is a module-level `useSyncExternalStore` rather than Redux or a
 * context. A scrolling screen writes to it ~once per direction change, and only
 * `TabLayout` reads it, so a context would re-render the whole tab tree and a
 * persisted Redux slice would restore a hidden tab bar on next launch.
 */
const AUTO_HIDES = Platform.OS === 'android';

/**
 * Downward travel, in points, before the bar gets out of the way. Generous:
 * hiding navigation is the disruptive direction, so it has to be a deliberate
 * scroll and not a thumb twitch.
 */
const HIDE_AFTER_PX = 32;

/**
 * Upward travel before it comes back. Deliberately much smaller — reaching for
 * navigation must feel instant, and the cost of showing it too eagerly is a
 * fraction of the cost of it not being there when reached for.
 */
const REVEAL_AFTER_PX = 8;

/** Near the top of a list the bar is always up, whatever the direction run says. */
const ALWAYS_VISIBLE_ABOVE_PX = 48;

let isHidden = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return isHidden;
}

function setTabBarHidden(next: boolean): void {
  if (next === isHidden) return;
  isHidden = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Whether the tab bar is currently scrolled out of the way. Read by
 * `app/(tabs)/_layout.tsx`; always `false` on iOS, where UIKit owns this.
 */
export function useIsTabBarHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface TabBarAutoHideScrollProps {
  /**
   * Spread onto a scrollable. Undefined off Android, where UIKit owns this and
   * the handler could only ever return immediately — a scroll event dispatched
   * to JS every frame, on all four tab roots, to do nothing.
   */
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  /**
   * The same reading, driven by a bare offset.
   *
   * `DraggableFlatList` renders its inner list as `{...props}` followed by its
   * own `onScroll` and `scrollEventThrottle`, so a spread handler is silently
   * discarded — the spread compiles, reads as working, and does nothing. Its
   * `onScrollOffsetChange` prop is the supported way in, and it hands over an
   * offset rather than an event, so the direction logic is shared through here
   * instead of being written twice.
   */
  onScrollOffset: (y: number) => void;
}

/**
 * Spread onto a tab root's primary scrollable so the tab bar hides while the
 * user reads downward and returns the moment they scroll back up.
 *
 * ```tsx
 * const tabBarAutoHide = useTabBarAutoHide();
 * <ScrollView {...tabBarAutoHide} />
 * ```
 */
export function useTabBarAutoHide(): TabBarAutoHideScrollProps {
  // Where the current direction run started, and the last offset seen. A run is
  // measured from its own anchor rather than frame-to-frame so a slow drag
  // accumulates instead of being read as a sequence of sub-threshold nudges.
  const anchorYRef = useRef(0);
  const lastYRef = useRef(0);
  const wasScrollingDownRef = useRef(false);
  const hasSampleRef = useRef(false);

  // Arriving on a screen — by tab press or by popping back to it — always finds
  // the tab bar up, even if it was left mid-scroll. Leaving one restores it for
  // whatever comes next, so a hidden bar can never outlive the screen that hid
  // it.
  useFocusEffect(
    useCallback(() => {
      anchorYRef.current = 0;
      lastYRef.current = 0;
      wasScrollingDownRef.current = false;
      hasSampleRef.current = false;
      setTabBarHidden(false);
      return () => setTabBarHidden(false);
    }, []),
  );

  const onScrollOffset = useCallback((y: number) => {
    if (!AUTO_HIDES) return;

    const previousY = lastYRef.current;
    const hadSample = hasSampleRef.current;
    lastYRef.current = y;
    hasSampleRef.current = true;

    // The top of the list is not a scroll direction — it is the resting state,
    // and iOS rubber-banding drives `y` negative there. Anchor to it so the
    // first real downward run is measured from zero.
    if (y <= ALWAYS_VISIBLE_ABOVE_PX) {
      anchorYRef.current = y;
      wasScrollingDownRef.current = false;
      setTabBarHidden(false);
      return;
    }

    // The first sample after arriving is a position, not a movement: a list
    // restored mid-scroll reports its whole offset in one event, which read as
    // a several-hundred-point downward run and hid the bar before the user had
    // touched anything.
    if (!hadSample) {
      anchorYRef.current = y;
      return;
    }

    const delta = y - previousY;
    if (delta === 0) return;

    const isScrollingDown = delta > 0;
    if (isScrollingDown !== wasScrollingDownRef.current) {
      // Direction flipped: restart the run at the turn — `previousY`, not `y`.
      // Anchoring at `y` would discard the sample that detected the flip, so
      // reversing course needed a whole extra frame of travel before the bar
      // came back, on the one move that has to feel immediate.
      wasScrollingDownRef.current = isScrollingDown;
      anchorYRef.current = previousY;
    }

    const travel = y - anchorYRef.current;
    if (travel > HIDE_AFTER_PX) {
      setTabBarHidden(true);
    } else if (travel < -REVEAL_AFTER_PX) {
      setTabBarHidden(false);
    }
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollOffset(event.nativeEvent.contentOffset.y);
    },
    [onScrollOffset],
  );

  return {
    // Both undefined off Android: there is nothing for them to do there, and a
    // 16 ms throttle would still cost a JS dispatch per frame to prove it.
    onScroll: AUTO_HIDES ? onScroll : undefined,
    scrollEventThrottle: AUTO_HIDES ? 16 : undefined,
    onScrollOffset,
  };
}
