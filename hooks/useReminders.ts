import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { scheduleReminder, hasPermissions } from '@/services/notificationService';
import { setReminderTime } from '@/store/settingsSlice';
import type { ReminderTime } from '@/services/notificationService';
import { analytics } from '@/services/analytics';
import { useAuth } from './useAuth';

export function useReminders() {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);
  const [isScheduling, setIsScheduling] = useState(false);
  const { user } = useAuth();

  // Initialize notifications on mount
  useEffect(() => {
    // Initialization is now handled automatically in scheduleReminder
  }, []);

  const updateReminderTime = async (newReminderTime: ReminderTime) => {
    setIsScheduling(true);
    try {
      // Schedule the reminder with user ID for personalized content
      await scheduleReminder(newReminderTime, user?.id);

      // Update the store
      dispatch(setReminderTime(newReminderTime));

      // Track analytics
      await analytics.track('SET_REMINDER_TIME', {
        hour: newReminderTime.hour,
        minute: newReminderTime.minute,
        enabled: newReminderTime.enabled,
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    try {
      return await hasPermissions();
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  };

  const formatReminderTime = (hour: number, minute: number) => {
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
