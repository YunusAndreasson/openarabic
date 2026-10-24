/**
 * sheetNavigation Tests
 *
 * Leaving a presented screen FOR another one is two navigations, and UIKit will
 * not let them overlap: nothing presents from a controller that is still
 * dismissing. So the destination is queued, the dismissal runs, and the queue is
 * flushed by whichever of the transition listener and the backstop timer gets
 * there first.
 *
 * The two variants differ only in HOW they leave:
 *
 * - `dismissSheetThenNavigate` pops one screen, which is all a sheet is
 * - `dismissAllThenNavigate` empties a nested modal stack, because the word
 *   screen sits two deep inside the dictionary modal and the article reader is
 *   itself a root-level modal — a single `back()` would leave the dictionary
 *   presented and the reader would be asked to appear from behind it
 *
 * They share one pending href and one timer, so only one navigation can ever be
 * in flight. That sharing is the part worth a test.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: jest.fn(() => true),
  },
}));

import { router } from 'expo-router';

import {
  dismissAllThenNavigate,
  dismissOrReplace,
  dismissSheetThenNavigate,
  flushPendingSheetNavigation,
} from '@/utils/sheetNavigation';

const mockRouter = jest.mocked(router);

describe('sheetNavigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRouter.canDismiss.mockReturnValue(true);
  });

  afterEach(() => {
    // Drain anything a test queued so it cannot leak into the next one.
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('dismissSheetThenNavigate', () => {
    test('pops the sheet immediately and navigates only once it has gone', () => {
      dismissSheetThenNavigate('/review');

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).not.toHaveBeenCalled();

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledWith('/review');
    });
  });

  describe('dismissAllThenNavigate', () => {
    test('empties the whole modal stack rather than popping one screen', () => {
      dismissAllThenNavigate('/article/1');

      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.back).not.toHaveBeenCalled();

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledWith('/article/1');
    });

    test('falls back to a plain pop when there is nothing to dismiss', () => {
      mockRouter.canDismiss.mockReturnValue(false);

      dismissAllThenNavigate('/article/1');

      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledWith('/article/1');
    });
  });

  describe('dismissOrReplace', () => {
    test('dismisses when there is a screen to go back to', () => {
      dismissOrReplace('/(tabs)/practice');

      expect(mockRouter.dismiss).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    test('replaces itself with the fallback when it is the only screen', () => {
      // Opened cold from a notification or a link: `dismiss()` does nothing,
      // and a push would leave this screen in history under the fallback.
      mockRouter.canDismiss.mockReturnValue(false);

      dismissOrReplace('/(tabs)/practice');

      expect(mockRouter.dismiss).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/practice');
    });
  });

  describe('the shared queue', () => {
    test('flushing is idempotent — both the listener and the timer call it', () => {
      dismissSheetThenNavigate('/review');

      flushPendingSheetNavigation();
      jest.runOnlyPendingTimers();
      flushPendingSheetNavigation();

      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });

    test('flushing with nothing queued navigates nowhere', () => {
      flushPendingSheetNavigation();

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('a second request replaces the pending one instead of queuing two', () => {
      dismissSheetThenNavigate('/due-words');
      dismissAllThenNavigate('/study-streak');

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/study-streak');
    });
  });
});
