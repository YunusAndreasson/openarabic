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

import { selectionFeedback } from '@/utils/haptics';

// Keep inline mock for this test since it needs direct access to jest.fn() instances for assertions
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  performAndroidHapticsAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  AndroidHaptics: {
    Segment_Tick: 'segment-tick',
    Virtual_Key: 'virtual-key',
    Context_Click: 'context-click',
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

  test('routes through performAndroidHapticsAsync on Android (haptics engine, not Vibrator)', () => {
    const { selectionAsync, performAndroidHapticsAsync, AndroidHaptics } = require('expo-haptics');
    jest.replaceProperty(Platform, 'OS', 'android');

    selectionFeedback();

    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(AndroidHaptics.Segment_Tick);
    expect(selectionAsync).not.toHaveBeenCalled();
  });
});
