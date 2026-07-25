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

import { detentFeedback, lightFeedback, selectionFeedback } from '@/utils/haptics';

// Keep inline mock for this test since it needs direct access to jest.fn() instances for assertions.
// Every expo-haptics function returns Promise<void> — the mocks must too, or
// utils/haptics can't attach the .catch() that swallows "no haptics engine".
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  AndroidHaptics: {
    Segment_Tick: 'segment-tick',
    Virtual_Key: 'virtual-key',
    Context_Click: 'context-click',
    Clock_Tick: 'clock-tick',
    Confirm: 'confirm',
    Reject: 'reject',
  },
}));

describe('haptics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
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
