import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime, setReminderEnabled, type ReminderTime } from '@/store/settingsSlice';
import { notificationService } from '@/services/notificationService';
import { analytics } from '@/services/analytics';

export const useReminders = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);

  // Provide fallback for reminderTime if it doesn't exist in persisted state
  const reminderTime: ReminderTime = settings.reminderTime || {
    hour: 19,
    minute: 0,
    enabled: false,
  };

  // Initialize reminder time if it doesn't exist
  useEffect(() => {
    if (!settings.reminderTime) {
      dispatch(setReminderTime(reminderTime));
    }
  }, [settings.reminderTime, dispatch, reminderTime]);

  // Initialize notification service on mount
  useEffect(() => {
    notificationService.initialize();
  }, []);

  // Schedule or cancel reminder when settings change
  useEffect(() => {
    const scheduleReminder = async () => {
      try {
        await notificationService.scheduleReminder(reminderTime);
      } catch (error) {
        console.error('Failed to schedule reminder:', error);
      }
    };

    scheduleReminder();
  }, [reminderTime]);

  const updateReminderTime = useCallback(
    async (hour: number, minute: number) => {
      const newReminderTime: ReminderTime = {
        hour,
        minute,
        enabled: reminderTime.enabled,
      };

      dispatch(setReminderTime(newReminderTime));

      // Track analytics
      try {
        await analytics.track('SET_REMINDER_TIME', {
          hour,
          minute,
          enabled: reminderTime.enabled,
        });
      } catch (error) {
        console.error('Failed to track reminder time change:', error);
      }
    },
    [dispatch, reminderTime.enabled]
  );

  const toggleReminder = useCallback(
    async (enabled: boolean) => {
      dispatch(setReminderEnabled(enabled));

      // Track analytics
      try {
        await analytics.track('TOGGLE_REMINDER', {
          enabled,
          hour: reminderTime.hour,
          minute: reminderTime.minute,
        });
      } catch (error) {
        console.error('Failed to track reminder toggle:', error);
      }
    },
    [dispatch, reminderTime.hour, reminderTime.minute]
  );

  const checkPermissions = useCallback(async () => {
    return await notificationService.hasPermissions();
  }, []);

  const formatReminderTime = useCallback((hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }, []);

  return {
    reminderTime,
    updateReminderTime,
    toggleReminder,
    checkPermissions,
    formatReminderTime,
  };
};
