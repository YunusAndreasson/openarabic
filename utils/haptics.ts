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
 * `detentFeedback` sits outside the ladder: it is continuous-gesture feedback
 * fired while a finger is still down, and its three tones say WHICH WAY rather
 * than HOW MUCH.
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
 * The platform pair behind each single-texture haptic.
 *
 * All seven used to be written out as the same nine-line body — debounce gate,
 * Platform branch, one Android constant, one iOS call — which is three lines of
 * ceremony per pattern and one more place for the two platforms to drift apart.
 * The iOS side is a thunk so no promise is constructed on Android.
 *
 * `detentFeedback` is deliberately NOT in here: its tone is a runtime argument,
 * not a fixed texture, so it keeps its own body below.
 */
type SimpleHapticKind = Extract<
  HapticKind,
  'selection' | 'light' | 'medium' | 'commit' | 'success' | 'warning' | 'error'
>;

const HAPTIC_PATTERNS: Record<
  SimpleHapticKind,
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

const fire = (kind: SimpleHapticKind): void => {
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
