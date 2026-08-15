import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { TIMING_CONSTANTS } from '@/constants/animation';

/**
 * Leaving a form sheet FOR somewhere else.
 *
 * A row inside a sheet that opens a screen has to do two navigations, and iOS
 * will not let them overlap: UIKit refuses to present anything from a
 * controller that is still dismissing, so a push issued while the sheet is on
 * its way out is dropped on the floor — the sheet closes and nothing arrives.
 * Android runs both without complaint, which is what makes this so easy to ship
 * broken.
 *
 * So the navigation is queued, the sheet is dismissed, and the queue is flushed
 * from two places: the root navigator's `transitionEnd` listener, which is the
 * correct moment and fires only if the platform delivers a closing event for a
 * screen it has already removed (measured: Android does not), and a timer, which
 * is what actually runs on Android and may well be what runs on iOS too.
 *
 * The timer's length is the part to be honest about. 300ms and 400ms were both
 * tried on iOS and both left the tap doing nothing, so `SHEET_DISMISS_FALLBACK`
 * is set well clear of a sheet's own slide-down rather than close to it. A tap
 * that works after a beat beats a tap that does nothing.
 *
 * The pending href lives at module scope rather than in state because the
 * component that sets it is, by definition, being unmounted.
 */
/**
 * Only iOS has the constraint, so only iOS pays for it. Android was verified to
 * dismiss and present in the same tick quite happily, and making it wait a
 * second bought nothing but a beat of empty screen between the sheet leaving and
 * the list arriving — which on iOS is hidden under the sheet's own slide-down.
 */
const DISMISS_DELAY = Platform.OS === 'ios' ? TIMING_CONSTANTS.SHEET_DISMISS_FALLBACK : 0;

let pendingHref: Href | null = null;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function clearFallback(): void {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

/**
 * Dismiss the sheet this is called from, then navigate once it has gone.
 *
 * `back` rather than `replace`: replacing a sheet with a nested route rebuilt
 * the tab state without the screen underneath, so closing the destination
 * dropped the learner on the wrong tab (measured on Android). Popping leaves the
 * stack it came from intact.
 */
export function dismissSheetThenNavigate(href: Href): void {
  pendingHref = href;
  clearFallback();
  fallbackTimer = setTimeout(flushPendingSheetNavigation, DISMISS_DELAY);
  router.back();
}

/**
 * Run whatever `dismissSheetThenNavigate` queued, if anything.
 *
 * Idempotent, and it has to be: both the `transitionEnd` listener and the
 * backstop timer call it, and on the platform where the event does fire they
 * both will.
 */
export function flushPendingSheetNavigation(): void {
  const href = pendingHref;
  pendingHref = null;
  clearFallback();
  if (href) router.push(href);
}
