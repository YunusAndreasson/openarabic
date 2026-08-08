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
 */

/** Minimum time between two firings of the SAME haptic pattern. */
const HAPTIC_DEBOUNCE_MS = 50;

/**
 * The distinct haptic patterns, used as debounce keys.
 *
 * The debounce is deliberately PER-PATTERN rather than global. A global block
 * meant that two semantically different haptics landing in the same 50ms —
 * exactly what happens when one interaction both crosses a gesture threshold
 * and commits (swipe-to-grade), or when a reveal is followed immediately by a
 * grade — silently dropped the second one. The user then felt a random subset
 * of the feedback the UI was trying to give. Repeats of the *same* pattern are
 * still what we want to swallow (double-fired press handlers), so keying by
 * pattern keeps the original protection without eating real signal.
 */
type HapticKind =
  | 'selection'
  | 'light'
  | 'medium'
  | 'rigid'
  | 'heavy'
  | 'soft'
  | 'commit'
  | 'success'
  | 'warning'
  | 'error';

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
 * Selection feedback for subtle interactions like:
 * - Toggle switches
 * - Filter selection
 * - Slider adjustments
 */
export const selectionFeedback = (): void => {
  if (shouldTriggerHaptic('selection')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick));
    } else {
      fireHaptic(Haptics.selectionAsync());
    }
  }
};

/**
 * Light feedback for confirmatory interactions like:
 * - Secondary button presses
 * - Non-critical confirmations
 * - Navigation actions
 */
export const lightFeedback = (): void => {
  if (shouldTriggerHaptic('light')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }
};

/**
 * Medium feedback for primary interactions like:
 * - Primary button presses
 * - Important selections
 * - Content actions
 */
export const mediumFeedback = (): void => {
  if (shouldTriggerHaptic('medium')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
  }
};

/**
 * Which side of a detent this tick is, and how much it should weigh.
 *
 * `crisp` — armed toward the lighter outcome (swipe right, "Knew it").
 * `heavy` — armed toward the heavier one (swipe left, "Forgot"). A miss should
 *           feel weightier than a clean recall, the same way the grade bar
 *           already weights its three taps.
 * `soft`  — the drag fell back below the line. A detent that only clicks on the
 *           way in is half a detent; the quieter tick on the way out is what
 *           makes "drag back to cancel" read as a mechanism rather than a
 *           dead zone.
 */
export type DetentTone = 'crisp' | 'heavy' | 'soft';

const DETENT_KIND: Record<DetentTone, HapticKind> = {
  crisp: 'rigid',
  heavy: 'heavy',
  soft: 'soft',
};

/**
 * Detent "click" for the moment a continuous gesture crosses a threshold and
 * the outcome flips — swipe-to-grade passing its commit point, a slider
 * snapping to a stop. This is the tick that tells the finger "release now and
 * it counts", so it has to read as mechanical: `Rigid` is UIKit's
 * low-compression impact and `Clock_Tick` is Android's detent tick (the one a
 * time picker uses).
 *
 * The tone carries WHICH way the outcome flipped, so a single tick can say both
 * "you've crossed" and "into this". The alternative — a second haptic on
 * release to name the grade — double-buzzes one decision, which is why the
 * release path deliberately fires nothing.
 *
 * Each tone debounces on its own key: an arm immediately followed by a disarm
 * is real signal, and a shared key would swallow the second one.
 *
 * Fire it from a gesture worklet via `scheduleOnRN` — expo-haptics is
 * async/JS-thread-only (there is no worklet-callable variant in SDK 57), so
 * hopping the runtime boundary is the supported path.
 */
export const detentFeedback = (tone: DetentTone = 'crisp'): void => {
  if (!shouldTriggerHaptic(DETENT_KIND[tone])) {
    return;
  }

  if (Platform.OS === 'android') {
    // Android's palette is coarser than UIKit's — these are the closest
    // semantic constants, not exact analogues of the iOS textures.
    const androidTone =
      tone === 'heavy'
        ? Haptics.AndroidHaptics.Long_Press
        : tone === 'soft'
          ? Haptics.AndroidHaptics.Segment_Frequent_Tick
          : Haptics.AndroidHaptics.Clock_Tick;
    fireHaptic(Haptics.performAndroidHapticsAsync(androidTone));
    return;
  }

  const iosTone =
    tone === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : tone === 'soft'
        ? Haptics.ImpactFeedbackStyle.Soft
        : Haptics.ImpactFeedbackStyle.Rigid;
  fireHaptic(Haptics.impactAsync(iosTone));
};

/**
 * The moment a decision is COMMITTED and the outcome is now fact — a review
 * card graded correct, an action that has taken effect.
 *
 * Same texture as `detentFeedback('crisp')` and deliberately so: a commit
 * should feel like the mechanism closing. It is a separate function because it
 * is a separate MOMENT. A detent is predictive — it fires while the finger is
 * still down and means "release now and it counts", so the user can still
 * change their mind. This fires after there is nothing left to change.
 *
 * It also needs its own debounce key. Sharing `'rigid'` with the detent would
 * let one swallow the other inside the 50ms window, and that is not a
 * hypothetical: a fast flick commits within a frame or two of arming, so the
 * two land almost together.
 *
 * Chosen over `successFeedback` for a graded card on weight. This fires on
 * roughly nine cards in ten, and iOS's Success texture is a two-tap
 * notification — distinctive once, noise twenty times a session.
 */
export const commitFeedback = (): void => {
  if (shouldTriggerHaptic('commit')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    }
  }
};

/**
 * Success feedback for positive outcomes like:
 * - Successful operations
 * - Achievements
 * - Completion states
 *
 * Reserved for session-scale moments (a completed review session). A single
 * graded card uses `commitFeedback` — see there for why.
 */
export const successFeedback = (): void => {
  if (shouldTriggerHaptic('success')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm));
    } else {
      fireHaptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }
  }
};

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
 * iOS has a dedicated Warning notification texture. Android does not — its
 * closest semantic constant is `Reject`, the same one `errorFeedback` uses, so
 * the two collapse into one texture there. That is a limitation of the
 * platform's palette, not an oversight.
 */
export const warningFeedback = (): void => {
  if (shouldTriggerHaptic('warning')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject));
    } else {
      fireHaptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    }
  }
};

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 * - Critical warnings
 */
export const errorFeedback = (): void => {
  if (shouldTriggerHaptic('error')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject));
    } else {
      fireHaptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    }
  }
};
