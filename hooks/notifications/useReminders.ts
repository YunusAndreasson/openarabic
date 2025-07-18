import { useMemo } from 'react';

import { STRINGS } from '@/constants/strings';
import { scheduleReminder } from '@/services/notificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

const analytics = {
  track: async (_event: string, _properties?: Record<string, unknown>) => {},
};

export interface UseRemindersResult {
  reminderTime: ReminderTime;
  updateReminderTime: (newReminderTime: ReminderTime) => Promise<void>;
  formatReminderTime: (hour: number, minute: number) => string;
}

export function useReminders(): UseRemindersResult {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);

  const updateReminderTime = async (newReminderTime: ReminderTime): Promise<void> => {
    try {
      // Schedule the reminder
      await scheduleReminder(newReminderTime);

      // Update the store
      dispatch(setReminderTime(newReminderTime));

      // Track analytics
      await analytics.track('SET_REMINDER_TIME', {
        hour: newReminderTime.hour,
        minute: newReminderTime.minute,
        enabled: newReminderTime.enabled,
      });
    } catch (error) {
      handleError(error as Error, { showToast: false });
    }
  };

  const formatReminderTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? STRINGS.PM : STRINGS.AM;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  return useMemo(
    () => ({
      reminderTime,
      updateReminderTime,
      formatReminderTime,
    }),
    [reminderTime, updateReminderTime, formatReminderTime]
  );
}
