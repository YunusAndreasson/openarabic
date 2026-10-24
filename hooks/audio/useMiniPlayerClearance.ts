import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';
import { useMiniPlayerHeight } from '@/hooks/audio/useMiniPlayerHeight';

/**
 * How much of the bottom of a scroll view the floating mini player covers: its
 * height plus the gap it floats at while it is showing, 0 while it is not.
 *
 * The player-only half of `useMiniPlayerClearance`, for a screen that accounts
 * for its own insets — the article reader, a modal with no tab bar to own the
 * Android inset, adds it to the full `insets.bottom`.
 */
export function useMiniPlayerOverlap(): number {
  const shouldShowMiniPlayer = useShouldShowMiniPlayer();
  const playerHeight = useMiniPlayerHeight();
  return shouldShowMiniPlayer ? playerHeight + LAYOUT.SPACING.SMALL : 0;
}

/**
 * Bottom content padding a scrolling tab screen must reserve so its last row
 * never hides behind the floating mini player. Use it for
 * `contentContainerStyle.paddingBottom`.
 *
 * This is what is left of `usePinnedActionClearance` after the pinned CTAs moved
 * into the navigation bar: the button's own height is gone, the reason for the
 * hook is not. The mini player still floats over the list, still appears and
 * disappears mid-session, and a fixed padding would strand the last ~120pt of
 * content behind it the moment audio starts.
 *
 * A tab screen's content view already ends flush above the native tab bar, so
 * on Android `insets.bottom` reports a gesture-nav strip this view never
 * reaches — adding it double-counts clearance the tab bar owns and leaves a
 * dead gap (measured ~32dp on-device). iOS's UITabBarController-hosted content
 * reads correctly with the raw inset, so only Android needs the exclusion.
 */
export function useMiniPlayerClearance(): number {
  const insets = useSafeAreaInsets();
  const miniPlayerOverlap = useMiniPlayerOverlap();

  const bottomInsetClearance = Platform.OS === 'android' ? 0 : insets.bottom;

  return bottomInsetClearance + miniPlayerOverlap + LAYOUT.SPACING.LARGE;
}
