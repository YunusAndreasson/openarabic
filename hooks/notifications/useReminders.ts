import { useCallback, useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError, toError } from '@/utils/errorHandling';

export interface UseRemindersResult {
  reminderTime: ReminderTime;
  updateReminderTime: (newReminderTime: ReminderTime) => Promise<void>;
  formatReminderTime: (hour: number, minute: number) => string;
}

export function useReminders(): UseRemindersResult {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);

  const updateReminderTime = useCallback(
    async (newReminderTime: ReminderTime): Promise<void> => {
      try {
        // Dispatch only — useSmartNotifications watches this setting and
        // reschedules the smart reminder plan on change.
        dispatch(setReminderTime(newReminderTime));
      } catch (error) {
        handleError(toError(error), { showToast: false });
      }
    },
    [dispatch],
  );

  const formatReminderTime = useCallback((hour: number, minute: number): string => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, []);

  return useMemo(
    () => ({
      reminderTime,
      updateReminderTime,
      formatReminderTime,
    }),
    [reminderTime, updateReminderTime, formatReminderTime],
  );
}
