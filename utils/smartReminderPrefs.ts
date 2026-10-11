/**
 * Headless mirror of the smart-reminder settings.
 * The background task runs without Redux, and parsing redux-persist's blob is
 * brittle — so useSmartNotifications writes these three fields to their own
 * AsyncStorage key whenever the setting changes, and the task reads them here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const SMART_REMINDER_PREFS_KEY = STORAGE_KEYS.SMART_REMINDER_PREFS;

/**
 * What the headless task needs beyond the setting itself. The session cooldown
 * lives in the in-memory query cache, which a task with no app running cannot
 * see — without this the task rebuilt the plan as if no session had just
 * finished and re-added the reminder the foreground had correctly dropped.
 */
export interface SmartReminderMirror extends ReminderTime {
  lastSessionCompletedAt?: number;
}

export async function readSmartReminderPrefs(): Promise<SmartReminderMirror | null> {
  try {
    const raw = await AsyncStorage.getItem(SMART_REMINDER_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SmartReminderMirror>;
    if (
      typeof parsed.hour !== 'number' ||
      typeof parsed.minute !== 'number' ||
      typeof parsed.enabled !== 'boolean'
    ) {
      return null;
    }
    return {
      hour: parsed.hour,
      minute: parsed.minute,
      enabled: parsed.enabled,
      ...(typeof parsed.lastSessionCompletedAt === 'number'
        ? { lastSessionCompletedAt: parsed.lastSessionCompletedAt }
        : {}),
    };
  } catch (error) {
    void handleError(error, { showToast: false });
    return null;
  }
}

export async function writeSmartReminderPrefs(prefs: SmartReminderMirror): Promise<void> {
  try {
    await AsyncStorage.setItem(SMART_REMINDER_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    void handleError(error, { showToast: false });
  }
}
