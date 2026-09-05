import { useCallback, useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';
import { format24HourTime } from '@/utils/dateTimeUtils';
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
        void handleError(toError(error), { showToast: false });
      }
    },
    [dispatch],
  );

  return useMemo(
    () => ({
      reminderTime,
      updateReminderTime,
      formatReminderTime: format24HourTime,
    }),
    [reminderTime, updateReminderTime],
  );
}
