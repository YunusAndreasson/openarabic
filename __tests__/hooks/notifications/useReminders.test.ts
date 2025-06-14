import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { useReminders } from '../../../hooks/notifications/useReminders';
import type { ReminderTime } from '../../../types/notifications.types';

jest.mock('../../../services/notificationService', () => ({
  scheduleReminder: jest.fn(),
  hasPermissions: jest.fn(),
}));

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const { scheduleReminder, hasPermissions } = require('../../../services/notificationService');
const { useAppDispatch, useAppSelector } = require('../../../store/hooks');
const { handleError } = require('../../../utils/errorHandling');

const mockDispatch = jest.fn();
const mockReminder: ReminderTime = { hour: 7, minute: 0, enabled: false };

beforeEach(() => {
  jest.clearAllMocks();
  (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
  (useAppSelector as jest.Mock).mockImplementation(selector => selector({ settings: { reminderTime: mockReminder } }));
});

describe('useReminders', () => {
  it('schedules reminder and updates state', async () => {
    const newTime: ReminderTime = { hour: 8, minute: 30, enabled: true };
    (scheduleReminder as jest.Mock).mockResolvedValue('id');

    const { result } = renderHook(() => useReminders());

    await act(async () => {
      await result.current.updateReminderTime(newTime);
    });

    expect(scheduleReminder).toHaveBeenCalledWith(newTime);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: newTime }));
    expect(handleError).not.toHaveBeenCalled();
    expect(result.current.isScheduling).toBe(false);
  });

  it('handles errors when scheduling reminder', async () => {
    const err = new Error('fail');
    (scheduleReminder as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useReminders());

    await act(async () => {
      await result.current.updateReminderTime(mockReminder);
    });

    expect(handleError).toHaveBeenCalledWith(err, expect.objectContaining({ showToast: false }));
    expect(result.current.isScheduling).toBe(false);
  });

  it('checks permissions successfully', async () => {
    (hasPermissions as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useReminders());

    const allowed = await result.current.checkPermissions();

    expect(allowed).toBe(true);
    expect(hasPermissions).toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('returns false when permission check fails', async () => {
    const err = new Error('perm');
    (hasPermissions as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useReminders());

    const allowed = await result.current.checkPermissions();

    expect(allowed).toBe(false);
    expect(handleError).toHaveBeenCalledWith(err, expect.objectContaining({ showToast: false }));
  });

  it('formats reminder time correctly', () => {
    const { result } = renderHook(() => useReminders());

    expect(result.current.formatReminderTime(0, 5)).toBe('12:05 AM');
    expect(result.current.formatReminderTime(15, 0)).toBe('3:00 PM');
  });
});
