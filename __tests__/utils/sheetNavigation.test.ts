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
    dismissAll: jest.fn(),
    canDismiss: jest.fn(() => true),
  },
}));

import { router } from 'expo-router';

import {
  dismissAllThenNavigate,
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
      dismissSheetThenNavigate('/target');

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).not.toHaveBeenCalled();

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledWith('/target');
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

  describe('the shared queue', () => {
    test('flushing is idempotent — both the listener and the timer call it', () => {
      dismissSheetThenNavigate('/target');

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
      dismissSheetThenNavigate('/first');
      dismissAllThenNavigate('/second');

      jest.runOnlyPendingTimers();

      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/second');
    });
  });
});
