import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface ReminderTime {
  hour: number;
  minute: number;
  enabled: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Study Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2C312B',
          sound: 'default',
          enableVibrate: true,
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async scheduleReminder(reminderTime: ReminderTime): Promise<string | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    try {
      // Cancel existing reminder first
      await this.cancelReminder();

      if (!reminderTime.enabled) {
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to practice Arabic! 📚',
          body: "Continue your Arabic learning journey with today's lesson.",
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'reminder',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: reminderTime.hour,
          minute: reminderTime.minute,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        },
      });

      console.log('Reminder scheduled with ID:', identifier);
      return identifier;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      return null;
    }
  }

  async cancelReminder(): Promise<void> {
    try {
      // Cancel all scheduled notifications (we only have one reminder type)
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All reminders cancelled');
    } catch (error) {
      console.error('Failed to cancel reminders:', error);
    }
  }

  async getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled reminders:', error);
      return [];
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
