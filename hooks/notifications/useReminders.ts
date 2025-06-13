import { useState } from 'react';

import { scheduleReminder, hasPermissions } from '@/services/notificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

// import { analytics } from '@/services/analytics';
// Temporary mock analytics until service is fixed
const analytics = {
  track: async (_event: string, _properties?: any) => {},
};

export interface UseRemindersResult {
  reminderTime: ReminderTime;
  updateReminderTime: (newReminderTime: ReminderTime) => Promise<void>;
  checkPermissions: () => Promise<boolean>;
  isScheduling: boolean;
  formatReminderTime: (hour: number, minute: number) => string;
}

export function useReminders(): UseRemindersResult {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);
  const [isScheduling, setIsScheduling] = useState(false);

  const updateReminderTime = async (newReminderTime: ReminderTime): Promise<void> => {
    setIsScheduling(true);
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
    } finally {
      setIsScheduling(false);
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    try {
      return await hasPermissions();
    } catch (error) {
      handleError(error as Error, { showToast: false });
      return false;
    }
  };

  const formatReminderTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  return {
    reminderTime,
    updateReminderTime,
    checkPermissions,
    isScheduling,
    formatReminderTime,
  };
}
