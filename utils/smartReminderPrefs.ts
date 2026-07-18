/**
 * Headless mirror of the smart-reminder settings.
 * The background task runs without Redux, and parsing redux-persist's blob is
 * brittle — so useSmartNotifications writes these three fields to their own
 * AsyncStorage key whenever the setting changes, and the task reads them here.
 */

import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';
import { storage } from '@/utils/safeAsyncStorage';

const SMART_REMINDER_PREFS_KEY = '@openarabic/notifications/smartReminderPrefs';

export async function readSmartReminderPrefs(): Promise<ReminderTime | null> {
  try {
    const raw = await storage.getItem(SMART_REMINDER_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReminderTime>;
    if (
      typeof parsed.hour !== 'number' ||
      typeof parsed.minute !== 'number' ||
      typeof parsed.enabled !== 'boolean'
    ) {
      return null;
    }
    return { hour: parsed.hour, minute: parsed.minute, enabled: parsed.enabled };
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return null;
  }
}

export async function writeSmartReminderPrefs(prefs: ReminderTime): Promise<void> {
  try {
    await storage.setItem(SMART_REMINDER_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    handleError(error as Error, { showToast: false });
  }
}
