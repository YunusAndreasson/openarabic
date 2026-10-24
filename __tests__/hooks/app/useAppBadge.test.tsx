/**
 * useAppBadge Hook Tests
 *
 * The badge is shared state — a delivered reminder and the headless background
 * task write it too, and iOS rejects the write outright until notifications are
 * authorized — so the contract under test is "re-assert, never cache".
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createHookTestWrapper, type HookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { fsrsQueries } from '@/constants/queries';
import { useAppBadge } from '@/hooks/app/useAppBadge';

const mockSetAppBadgeCount = jest.fn(async (..._args: unknown[]) => true);
jest.mock('@/services/notificationService', () => ({
  setAppBadgeCount: (count: number) => mockSetAppBadgeCount(count),
}));

const USER_ID = 'test-user-id';
let mockIsAuthenticated = true;
let mockIsAuthLoading = false;
let mockRemindersEnabled = false;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ settings: { reminderTime: { enabled: mockRemindersEnabled } } }),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockIsAuthenticated ? { id: USER_ID } : null,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsAuthLoading,
  }),
}));

describe('useAppBadge', () => {
  let queryClient: QueryClient;
  let wrapper: HookTestWrapper;
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];
  let seedClock = Date.now();

  const words = (n: number) =>
    Array.from({ length: n }, (_, i) => createTestWord({ root_id: rootId(i + 1) }));

  /** The single due entry the badge, the background task and the planner share. */
  const dueKey = fsrsQueries.due(USER_ID).queryKey;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ wrapper, queryClient } = createHookTestWrapper());
    appStateListeners = [];
    seedClock = Date.now();
    mockIsAuthenticated = true;
    mockIsAuthLoading = false;
    mockRemindersEnabled = false;
    mockSetAppBadgeCount.mockResolvedValue(true);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'change') appStateListeners.push(handler);
      return { remove: jest.fn() };
    });
  });

  const emitAppState = (state: AppStateStatus) =>
    appStateListeners.forEach(listener => listener(state));

  // Every seed is a distinct fetch moment. Without an explicit `updatedAt`, two
  // seeds inside the same millisecond leave `dataUpdatedAt` unchanged, and the
  // re-assert this hook now performs on a fresh read would be untestable —
  // vacuously passing or, here, vacuously failing.
  const seedDueWords = (count: number) =>
    queryClient.setQueryData(dueKey, words(count), { updatedAt: (seedClock += 1000) });

  test('mirrors the due-words count onto the badge', async () => {
    seedDueWords(3);

    renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3));
  });

  test('leaves the badge alone until the count is known', async () => {
    renderHook(() => useAppBadge(), { wrapper });

    // No cached due list yet (cold start / offline): blanking the icon here
    // would wipe a count a delivered reminder legitimately put there.
    await act(async () => {});

    expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
  });

  test('leaves the badge alone while auth is still restoring', async () => {
    // Every launch starts here: isLoading true, isAuthenticated false. Reading
    // that as "signed out, so 0" wiped a reminder's badge on every cold start.
    mockIsAuthLoading = true;
    mockIsAuthenticated = false;

    const { rerender } = renderHook(() => useAppBadge(), { wrapper });

    await act(async () => {});
    expect(mockSetAppBadgeCount).not.toHaveBeenCalled();

    // Session restores and the due list lands: now the icon may be written.
    mockIsAuthLoading = false;
    mockIsAuthenticated = true;
    seedDueWords(5);
    rerender({});

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(5));
  });

  test('writes 0 when the learner is caught up', async () => {
    seedDueWords(0);

    renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(0));
  });

  test('re-asserts the count on resume, even when it has not changed', async () => {
    // The regression: a reminder delivered while the app was away sets the icon
    // to 9. Reopening with a true count of 0 must still write 0 — the old hook
    // cached "I last wrote 0" and skipped it, leaving the icon stuck at 9.
    seedDueWords(0);

    renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(0));
    mockSetAppBadgeCount.mockClear();

    await act(async () => {
      emitAppState('background');
      emitAppState('active');
    });

    expect(mockSetAppBadgeCount).toHaveBeenCalledWith(0);
  });

  test('follows the due entry the background task and planner also use', async () => {
    seedDueWords(1);
    renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(1));

    await act(async () => {
      seedDueWords(4);
    });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(4));
  });

  test('re-asserts on a refetch that returns the same count', async () => {
    // The write is permission-gated: an unauthorized install swallows it and
    // keeps a stale number. Writing only when the NUMBER changes leaves that
    // icon wrong indefinitely, so a fresh read must re-assert even when it
    // agrees with the last one.
    seedDueWords(3);

    renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3));
    mockSetAppBadgeCount.mockClear();

    // Same count, freshly fetched — what a post-review invalidation looks like
    // when the reviewed word was replaced by another that came due.
    await act(async () => {
      seedDueWords(3);
    });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3));
  });

  test('re-asserts when reminders are enabled', async () => {
    // Enabling reminders is what runs the OS permission dialog, so it is the
    // first instant a rejected write can land. Nothing else would re-assert
    // until the count next changed.
    seedDueWords(4);

    const { rerender } = renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(4));
    mockSetAppBadgeCount.mockClear();

    mockRemindersEnabled = true;
    rerender({});

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(4));
  });

  test('clears the badge when the user signs out', async () => {
    seedDueWords(2);
    const { rerender } = renderHook(() => useAppBadge(), { wrapper });

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(2));

    mockIsAuthenticated = false;
    rerender({});

    await waitFor(() => expect(mockSetAppBadgeCount).toHaveBeenCalledWith(0));
  });
});
