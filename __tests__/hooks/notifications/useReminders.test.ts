/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { beforeEach, describe, expect, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useReminders } from '../../../hooks/notifications/useReminders';
import type { ReminderTime } from '../../../types/notifications.types';

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../../utils/errorHandling', () => ({
  handleError: jest.fn(),
  toError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
}));

const { useAppDispatch, useAppSelector } = require('../../../store/hooks');
const { handleError } = require('../../../utils/errorHandling');

const mockDispatch = jest.fn();
const mockReminder: ReminderTime = { hour: 7, minute: 0, enabled: false };

beforeEach(() => {
  jest.clearAllMocks();
  (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
  (useAppSelector as jest.Mock).mockImplementation(selector =>
    selector({ settings: { reminderTime: mockReminder } }),
  );
});

describe('useReminders', () => {
  test('dispatches the new reminder time (scheduling is owned by useSmartNotifications)', async () => {
    const newTime: ReminderTime = { hour: 8, minute: 30, enabled: true };

    const { result } = renderHook(() => useReminders());

    await act(async () => {
      await result.current.updateReminderTime(newTime);
    });

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: newTime }));
    expect(handleError).not.toHaveBeenCalled();
  });

  test('handles dispatch errors without throwing', async () => {
    const err = new Error('fail');
    mockDispatch.mockImplementationOnce(() => {
      throw err;
    });

    const { result } = renderHook(() => useReminders());

    await act(async () => {
      await result.current.updateReminderTime(mockReminder);
    });

    expect(handleError).toHaveBeenCalledWith(err, expect.objectContaining({ showToast: false }));
  });

  test('formats reminder time correctly', () => {
    const { result } = renderHook(() => useReminders());

    expect(result.current.formatReminderTime(0, 5)).toBe('00:05');
    expect(result.current.formatReminderTime(15, 0)).toBe('15:00');
  });
});
