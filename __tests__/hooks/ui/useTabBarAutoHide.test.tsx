import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, jest } from '@jest/globals';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Platform } from 'react-native';

// `useFocusEffect` runs its callback on mount and its cleanup on unmount, which
// is exactly the lifecycle the hook relies on to guarantee the bar is up on
// arrival and restored on departure.
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback: () => undefined | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

// Android is the only platform that runs this logic — iOS hands the same job to
// UIKit's `minimizeBehavior`, so the JS store must stay untouched there.
Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });

// Imported after the Platform stub: the module reads `Platform.OS` once, at
// load, into its `AUTO_HIDES` constant.
const { useIsTabBarHidden, useTabBarAutoHide } =
  require('@/hooks/ui/useTabBarAutoHide') as typeof import('@/hooks/ui/useTabBarAutoHide');

const scrollTo = (y: number) =>
  ({ nativeEvent: { contentOffset: { y } } }) as NativeSyntheticEvent<NativeScrollEvent>;

/** Drives one screen's scroll handler and one reader of the shared store. */
function renderAutoHide() {
  const scroller = renderHook(() => useTabBarAutoHide());
  const reader = renderHook(() => useIsTabBarHidden());

  return {
    scroller,
    isHidden: () => reader.result.current,
    scroll: (...offsets: number[]) => {
      act(() => {
        for (const y of offsets) {
          // Non-null because these run with Platform.OS stubbed to android; off
          // Android the hook returns no handler at all, which is the point —
          // there is nothing for it to do where UIKit owns the behaviour.
          const onScroll = scroller.result.current.onScroll;
          if (!onScroll) throw new Error('expected a scroll handler on android');
          onScroll(scrollTo(y));
        }
      });
    },
  };
}

// The visibility store is module-level and outlives a single test. It needs no
// explicit reset: RNTL's automatic cleanup unmounts every rendered hook after
// each case, and unmounting is exactly what restores the bar — the same
// guarantee the hook makes to a screen the user navigates away from.
describe('useTabBarAutoHide', () => {
  test('leaves the tab bar up until a deliberate downward run', () => {
    const { scroll, isHidden } = renderAutoHide();

    // 32px is the hide threshold; 60 → 80 travels 20 and must not trip it.
    scroll(60, 70, 80);

    expect(isHidden()).toBeFalsy();
  });

  test('hides the tab bar once the downward run passes the threshold', () => {
    const { scroll, isHidden } = renderAutoHide();

    scroll(60, 100, 140);

    expect(isHidden()).toBeTruthy();
  });

  test('brings it back on a much smaller upward move', () => {
    const { scroll, isHidden } = renderAutoHide();

    scroll(60, 140);
    expect(isHidden()).toBeTruthy();

    // Reaching for navigation must feel instant: 12px up is enough, where 32px
    // down was needed to hide it.
    scroll(128);

    expect(isHidden()).toBeFalsy();
  });

  test('always shows the bar near the top of the list', () => {
    const { scroll, isHidden } = renderAutoHide();

    scroll(200, 400);
    expect(isHidden()).toBeTruthy();

    // A jump back to the top (tab re-press, scroll-to-top) is not a direction
    // run — it is the resting state.
    scroll(0);

    expect(isHidden()).toBeFalsy();
  });

  test('restores the tab bar when the screen goes away still scrolled', () => {
    const { scroller, scroll, isHidden } = renderAutoHide();

    scroll(60, 200);
    expect(isHidden()).toBeTruthy();

    act(() => scroller.unmount());

    // Otherwise a hidden bar outlives the screen that hid it and the next tab
    // opens with no navigation at all.
    expect(isHidden()).toBeFalsy();
  });
});
