import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

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
  (useAppSelector as jest.Mock).mockImplementation(selector =>
    selector({ settings: { reminderTime: mockReminder } })
  );
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
  });

  it('handles errors when scheduling reminder', async () => {
    const err = new Error('fail');
    (scheduleReminder as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useReminders());

    await act(async () => {
      await result.current.updateReminderTime(mockReminder);
    });

    expect(handleError).toHaveBeenCalledWith(err, expect.objectContaining({ showToast: false }));
  });

  it('formats reminder time correctly', () => {
    const { result } = renderHook(() => useReminders());

    expect(result.current.formatReminderTime(0, 5)).toBe('12:05 AM');
    expect(result.current.formatReminderTime(15, 0)).toBe('3:00 PM');
  });
});
