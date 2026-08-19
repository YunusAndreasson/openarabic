import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { selectHapticsEnabled } from '@/store/settingsSlice';
import { store } from '@/store/store';

/**
 * Standardized haptic feedback patterns for consistent user experience
 * Based on semantic meaning rather than technical implementation
 *
 * Platform routing: iOS maps to the UIKit feedback generators. Android uses
 * performAndroidHapticsAsync — the expo-haptics docs deprecate the classic
 * impactAsync/notificationAsync path there (it's simulated through the legacy
 * Vibrator API), while performAndroidHapticsAsync drives the device's haptics
 * engine with semantic HapticFeedbackConstants and needs no VIBRATE permission.
 *
 * ---
 *
 * THE LADDER
 *
 * These functions have been reassigned three times now, each pass fixing one
 * call site and leaving the ordering to chance, so the ordering is written down
 * here. One rule holds it together:
 *
 *   **No press may ever outweigh an outcome.**
 *
 * A press is the user asking; an outcome is the app answering. When a button
 * buzzes harder than the grade it leads to — which is what the review session
 * did, revealing on Light and grading "Guessed" on Selection — every tap feels
 * consequential and no result feels like a result.
 *
 *   tier 0  acknowledge      selectionFeedback   the faintest thing available.
 *                                                Any press that only moves the
 *                                                UI: reveal, continue, close,
 *                                                toggles, retry.
 *   tier 1  outcome, soft    lightFeedback       a real result, lightly held —
 *                                                "Guessed". Also the mic going
 *                                                live, which is the app saying
 *                                                "go" rather than "heard you".
 *   tier 2  outcome, firm    commitFeedback      a decision now fact — a card
 *                                                recalled cleanly.
 *   tier 3  outcome, adverse errorFeedback       scored against the user — a
 *                                                miss.
 *   —       app's fault      warningFeedback     not the user's outcome at all:
 *                                                dead mic, silent prompt.
 *   —       session scale    successFeedback     rare by construction. One per
 *                                                completed session.
 *
 * Adding a haptic to a control? Start at tier 0 and only climb if you can say
 * what outcome it reports.
 */

/** Minimum time between two firings of the SAME haptic pattern. */
const HAPTIC_DEBOUNCE_MS = 50;

/**
 * The distinct haptic patterns, used as debounce keys.
 *
 * The debounce is deliberately PER-PATTERN rather than global. A global block
 * meant that two semantically different haptics landing in the same 50ms —
 * exactly what happens when a reveal is followed immediately by a grade, or a
 * mic goes live on the heels of the tap that armed it — silently dropped the
 * second one. The user then felt a random subset
 * of the feedback the UI was trying to give. Repeats of the *same* pattern are
 * still what we want to swallow (double-fired press handlers), so keying by
 * pattern keeps the original protection without eating real signal.
 */
type HapticKind = 'selection' | 'light' | 'medium' | 'commit' | 'success' | 'warning' | 'error';

const blockedKinds = new Set<HapticKind>();

/**
 * Internal function to check if haptic feedback should be triggered
 * based on debounce timing and user preferences
 */
const shouldTriggerHaptic = (kind: HapticKind): boolean => {
  // Explicitly `!== false` (via the selector), because the flag is absent from
  // state persisted before it existed and absent must mean ON — see
  // selectHapticsEnabled for why a truthiness check silently muted the app.
  if (!selectHapticsEnabled(store.getState())) {
    return false;
  }

  if (blockedKinds.has(kind)) {
    return false;
  }

  blockedKinds.add(kind);
  setTimeout(() => {
    blockedKinds.delete(kind);
  }, HAPTIC_DEBOUNCE_MS);

  return true;
};

/**
 * Fire a haptic without awaiting it, swallowing rejection.
 *
 * Every expo-haptics call returns a Promise<void>, and these helpers are
 * deliberately fire-and-forget (`: void`). Dropping the promise meant a device
 * with no haptics engine — common on budget/older Android hardware, which
 * rejects with "A haptics engine is not available on this device" — produced an
 * *unhandled rejection* on every single tap. Sentry's global handler reported
 * each one, making this the single largest source of production errors.
 *
 * Haptics are cosmetic: there is nothing to recover from and nothing to tell
 * the user, so the rejection is discarded rather than routed to handleError.
 */
const fireHaptic = (haptic: Promise<void>): void => {
  haptic.catch(() => {
    // No haptics engine / haptics unavailable — cosmetic only, nothing to do.
  });
};

/**
 * The platform pair behind every haptic.
 *
 * Each used to be written out as the same nine-line body — debounce gate,
 * Platform branch, one Android constant, one iOS call — which is three lines of
 * ceremony per pattern and one more place for the two platforms to drift apart.
 * The iOS side is a thunk so no promise is constructed on Android.
 *
 * Keyed by `HapticKind` directly. It was keyed by an `Extract<>` subset back
 * when `detentFeedback` took its tone as a runtime argument and so kept its own
 * body; that function is gone, every kind now lives here, and a subset alias
 * would only be a third place to remember when adding one.
 */
const HAPTIC_PATTERNS: Record<
  HapticKind,
  { android: Haptics.AndroidHaptics; ios: () => Promise<void> }
> = {
  selection: {
    android: Haptics.AndroidHaptics.Segment_Tick,
    ios: () => Haptics.selectionAsync(),
  },
  light: {
    android: Haptics.AndroidHaptics.Virtual_Key,
    ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  },
  medium: {
    android: Haptics.AndroidHaptics.Context_Click,
    ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  commit: {
    android: Haptics.AndroidHaptics.Clock_Tick,
    ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  },
  success: {
    android: Haptics.AndroidHaptics.Confirm,
    ios: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  },
  // Android has no Warning analogue — `Reject` is its closest semantic
  // constant, the same one `error` uses, so the two collapse into one texture
  // there. That is a limitation of the platform's palette, not an oversight.
  warning: {
    android: Haptics.AndroidHaptics.Reject,
    ios: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
  error: {
    android: Haptics.AndroidHaptics.Reject,
    ios: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  },
};

const fire = (kind: HapticKind): void => {
  if (!shouldTriggerHaptic(kind)) {
    return;
  }
  const pattern = HAPTIC_PATTERNS[kind];
  fireHaptic(
    Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(pattern.android) : pattern.ios(),
  );
};

/**
 * Selection feedback for subtle interactions like:
 * - Toggle switches
 * - Filter selection
 * - Slider adjustments
 */
export const selectionFeedback = (): void => fire('selection');

/**
 * Light feedback for confirmatory interactions like:
 * - Secondary button presses
 * - Non-critical confirmations
 * - Navigation actions
 */
export const lightFeedback = (): void => fire('light');

/**
 * Medium feedback for primary interactions like:
 * - Primary button presses
 * - Important selections
 * - Content actions
 */
export const mediumFeedback = (): void => fire('medium');

/**
 * The moment a decision is COMMITTED and the outcome is now fact — a review
 * card graded correct, an action that has taken effect.
 *
 * `Rigid` / `Clock_Tick` — the mechanism closing. Deliberately its own debounce
 * key: the key is per-MOMENT, not per-texture, so a commit can never be
 * swallowed by another tick that happens to land in the same 50ms window. (It
 * once shared a key with a swipe's threshold detent, which a fast flick could
 * follow within a frame or two; the gesture is gone, the separation is still
 * correct.)
 *
 * Chosen over `successFeedback` for a graded card on weight. This fires on
 * roughly nine cards in ten, and iOS's Success texture is a two-tap
 * notification — distinctive once, noise twenty times a session.
 */
export const commitFeedback = (): void => fire('commit');

/**
 * Success feedback for positive outcomes like:
 * - Successful operations
 * - Achievements
 * - Completion states
 *
 * Reserved for session-scale moments (a completed review session). A single
 * graded card uses `commitFeedback` — see there for why.
 */
export const successFeedback = (): void => fire('success');

/**
 * Warning feedback for "something went wrong, and it wasn't your fault":
 * - The microphone never opened, or opened deaf
 * - The Arabic prompt failed to play
 * - We captured audio but nothing usable came out of it
 *
 * Distinct from `errorFeedback`, which scores an outcome against the user. The
 * cases above are the app failing, and total silence is worse than a soft
 * warning: after speaking into a mic you cannot tell "heard nothing" from
 * "still thinking".
 *
 * iOS has a dedicated Warning notification texture; Android does not — see the
 * `warning` entry in HAPTIC_PATTERNS.
 */
export const warningFeedback = (): void => fire('warning');

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 * - Critical warnings
 */
export const errorFeedback = (): void => fire('error');
