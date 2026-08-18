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

import {
  commitFeedback,
  detentFeedback,
  lightFeedback,
  selectionFeedback,
  warningFeedback,
} from '@/utils/haptics';

// Keep inline mock for this test since it needs direct access to jest.fn() instances for assertions.
// Every expo-haptics function returns Promise<void> — the mocks must too, or
// utils/haptics can't attach the .catch() that swallows "no haptics engine".
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn((..._args: unknown[]) => Promise.resolve()),
  impactAsync: jest.fn((..._args: unknown[]) => Promise.resolve()),
  notificationAsync: jest.fn((..._args: unknown[]) => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn((..._args: unknown[]) => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Rigid: 'rigid',
    Soft: 'soft',
  },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  AndroidHaptics: {
    Segment_Tick: 'segment-tick',
    Segment_Frequent_Tick: 'segment-frequent-tick',
    Virtual_Key: 'virtual-key',
    Context_Click: 'context-click',
    Clock_Tick: 'clock-tick',
    Long_Press: 'long-press',
    Confirm: 'confirm',
    Reject: 'reject',
  },
}));

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
  // the second — e.g. a swipe crossing its commit threshold and the grade that
  // follows, or a reveal followed straight away by a grade. The user then felt
  // a random subset of the feedback the UI was trying to give.
  test('does not let one pattern swallow a different pattern', () => {
    const { selectionAsync, impactAsync } = require('expo-haptics');

    selectionFeedback();
    lightFeedback();
    detentFeedback();

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledTimes(2); // light + rigid detent
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

  // commitFeedback and detentFeedback('crisp') share a TEXTURE but not a
  // moment: the detent fires while the finger is still down and the outcome can
  // still be changed, the commit fires once it cannot. A fast flick produces
  // both within a frame or two, so they must not share a debounce key — with
  // one, the commit (the more informative of the two) was the one swallowed.
  test('a commit is not swallowed by a detent in the same window', () => {
    const { impactAsync } = require('expo-haptics');

    detentFeedback('crisp');
    commitFeedback();

    expect(impactAsync).toHaveBeenCalledTimes(2);
  });

  test('detentFeedback uses the rigid impact on iOS', () => {
    const { impactAsync, ImpactFeedbackStyle } = require('expo-haptics');

    detentFeedback();

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Rigid);
  });

  test('detentFeedback uses the Android detent tick', () => {
    const { performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    detentFeedback();

    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(AndroidHaptics.Clock_Tick);
  });

  // The tone is what tells "armed into Forgot" apart from "armed into Knew it"
  // and from "dropped back below the line" — one tick, three meanings. Before
  // this they were the same Rigid impact, so the swipe's only haptic carried no
  // information about which way it was going.
  test('detentFeedback weights each tone differently on iOS', () => {
    const { impactAsync, ImpactFeedbackStyle } = require('expo-haptics');

    detentFeedback('crisp');
    detentFeedback('heavy');
    detentFeedback('soft');

    expect(impactAsync).toHaveBeenNthCalledWith(1, ImpactFeedbackStyle.Rigid);
    expect(impactAsync).toHaveBeenNthCalledWith(2, ImpactFeedbackStyle.Heavy);
    expect(impactAsync).toHaveBeenNthCalledWith(3, ImpactFeedbackStyle.Soft);
  });

  test('detentFeedback maps each tone to an Android constant', () => {
    const { performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    detentFeedback('crisp');
    detentFeedback('heavy');
    detentFeedback('soft');

    expect(performAndroidHapticsAsync).toHaveBeenNthCalledWith(1, AndroidHaptics.Clock_Tick);
    expect(performAndroidHapticsAsync).toHaveBeenNthCalledWith(2, AndroidHaptics.Long_Press);
    expect(performAndroidHapticsAsync).toHaveBeenNthCalledWith(
      3,
      AndroidHaptics.Segment_Frequent_Tick,
    );
  });

  // Each tone debounces on its own key. An arm immediately followed by a disarm
  // (a fast drag past the line and back) is real signal, and a shared key would
  // silently eat the second tick.
  test('one detent tone does not swallow another', () => {
    const { impactAsync } = require('expo-haptics');

    detentFeedback('crisp');
    detentFeedback('soft');

    expect(impactAsync).toHaveBeenCalledTimes(2);
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
  });

  test('swallows a rejected Android haptic too', async () => {
    jest.useRealTimers();
    // The debounce flag lives at module scope and is released by a real 50ms
    // timeout that the previous real-timer test left pending — wait it out, or
    // shouldTriggerHaptic() short-circuits and nothing is called.
    await new Promise(resolve => setTimeout(resolve, 60));

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
  });
});
