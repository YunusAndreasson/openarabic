/**
 * Haptics Tests
 *
 * Tests haptic feedback debouncing logic and platform routing.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - uses fake timers
 * - Note: No jest.mocked() needed - inline mock pattern
 */

import { beforeEach, afterEach, describe, expect, test, jest } from '@jest/globals';
import { Platform } from 'react-native';

import { commitFeedback, lightFeedback, selectionFeedback, warningFeedback } from '@/utils/haptics';

// expo-haptics is the global mock (__mocks__/expo-haptics.js): every function
// returns Promise<void> in every test, so utils/haptics can attach the .catch()
// that swallows "no haptics engine". A local factory here had its
// implementations stripped by `resetMocks`.

// The settings gate reads the store directly (module singleton, no subscription),
// so drive it from here rather than standing up a real store per case.
const mockSettings: { hapticsEnabled?: boolean } = {};
jest.mock('@/store/store', () => ({
  store: { getState: () => ({ settings: mockSettings }) },
}));

describe('haptics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSettings.hapticsEnabled = true;
  });

  afterEach(() => {
    // Flush the module-level debounce-release timeout so the block flag from
    // this test's haptic calls doesn't leak into the next test.
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('prevents double selectionFeedback within debounce window', () => {
    const { selectionAsync } = require('expo-haptics');

    selectionFeedback();
    selectionFeedback();

    // Only first call should pass
    expect(selectionAsync).toHaveBeenCalledTimes(1);

    // Advance time past debounce and call again
    jest.advanceTimersByTime(60);
    selectionFeedback();
    expect(selectionAsync).toHaveBeenCalledTimes(2);
  });

  // Regression: the debounce used to be a single global flag, so two
  // semantically DIFFERENT haptics landing in the same 50ms silently dropped
  // the second — e.g. a reveal followed straight away by a grade, or a mic
  // going live on the heels of the tap that armed it. The user then felt a
  // random subset of the feedback the UI was trying to give.
  test('does not let one pattern swallow a different pattern', () => {
    const { selectionAsync, impactAsync } = require('expo-haptics');

    selectionFeedback();
    lightFeedback();
    commitFeedback();

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledTimes(2); // light + rigid commit
  });

  test('commitFeedback uses the rigid impact on iOS', () => {
    const { impactAsync, ImpactFeedbackStyle } = require('expo-haptics');

    commitFeedback();

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Rigid);
  });

  test('commitFeedback uses the Android detent tick', () => {
    const { performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    commitFeedback();

    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(AndroidHaptics.Clock_Tick);
  });

  test('warningFeedback uses the iOS warning notification', () => {
    const { notificationAsync, NotificationFeedbackType } = require('expo-haptics');

    warningFeedback();

    expect(notificationAsync).toHaveBeenCalledWith(NotificationFeedbackType.Warning);
  });

  test('warningFeedback falls back to Reject on Android', () => {
    const { performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    warningFeedback();

    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(AndroidHaptics.Reject);
  });

  // Regression, and the reason this whole feature was dead for most of the
  // install base: `hapticsEnabled` is ABSENT from state persisted before the
  // flag shipped (the settings slice has been persisted since Feb 2025, the flag
  // was added Nov 2025, and persistConfig has no migrate). A truthiness check
  // read that as "off" and silently muted every haptic in the app — invisible on
  // a fresh install, which is why it survived.
  test('fires when hapticsEnabled is absent from persisted state', () => {
    const { selectionAsync } = require('expo-haptics');
    delete mockSettings.hapticsEnabled;

    selectionFeedback();

    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  test('stays silent when hapticsEnabled is explicitly false', () => {
    const { selectionAsync } = require('expo-haptics');
    mockSettings.hapticsEnabled = false;

    selectionFeedback();

    expect(selectionAsync).not.toHaveBeenCalled();
  });

  test('routes through performAndroidHapticsAsync on Android (haptics engine, not Vibrator)', () => {
    const { selectionAsync, performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    selectionFeedback();

    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(AndroidHaptics.Segment_Tick);
    expect(selectionAsync).not.toHaveBeenCalled();
  });

  // Regression: devices without a haptics engine reject the native call. These
  // helpers are fire-and-forget, so an unhandled rejection was reaching Sentry on
  // every tap — it was the single largest source of production errors.
  test('swallows a rejected haptic instead of leaking an unhandled rejection', async () => {
    jest.useRealTimers();
    const { selectionAsync } = require('expo-haptics');
    selectionAsync.mockRejectedValue(new Error('A haptics engine is not available on this device'));

    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    expect(() => selectionFeedback()).not.toThrow();
    // Let the microtask queue drain so an unattached rejection would surface.
    await new Promise(resolve => setImmediate(resolve));

    process.off('unhandledRejection', unhandled);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();

    // Let this call's real debounce timer release its module-level key before
    // the next test. Test order must not decide whether selection haptics fire.
    await new Promise(resolve => setTimeout(resolve, 60));
    jest.useFakeTimers();
  });

  test('swallows a rejected Android haptic too', async () => {
    jest.useRealTimers();
    const { performAndroidHapticsAsync } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');
    performAndroidHapticsAsync.mockRejectedValue(new Error('A haptics engine is not available'));

    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    expect(() => selectionFeedback()).not.toThrow();
    await new Promise(resolve => setImmediate(resolve));

    process.off('unhandledRejection', unhandled);
    expect(performAndroidHapticsAsync).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();

    await new Promise(resolve => setTimeout(resolve, 60));
    jest.useFakeTimers();
  });
});
