import { useCallback, useMemo } from 'react';

import { STRINGS } from '@/constants/strings';
import { scheduleReminder } from '@/services/notificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

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
        // Schedule the reminder
        await scheduleReminder(newReminderTime);

        // Update the store
        dispatch(setReminderTime(newReminderTime));
      } catch (error) {
        handleError(error as Error, { showToast: false });
      }
    },
    [dispatch]
  );

  const formatReminderTime = useCallback((hour: number, minute: number): string => {
    const period = hour >= 12 ? STRINGS.PM : STRINGS.AM;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }, []);

  return useMemo(
    () => ({
      reminderTime,
      updateReminderTime,
      formatReminderTime,
    }),
    [reminderTime, updateReminderTime, formatReminderTime]
  );
}
