/**
 * Headless mirror of the smart-reminder settings.
 * The background task runs without Redux, and parsing redux-persist's blob is
 * brittle — so useSmartNotifications writes these three fields to their own
 * AsyncStorage key whenever the setting changes, and the task reads them here.
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { ReminderTime } from '@/types/notifications.types';
import { createJsonStore } from '@/utils/createJsonStore';

/**
 * What the headless task needs beyond the setting itself. The session cooldown
 * lives in the in-memory query cache, which a task with no app running cannot
 * see — without this the task rebuilt the plan as if no session had just
 * finished and re-added the reminder the foreground had correctly dropped.
 */
export interface SmartReminderMirror extends ReminderTime {
  lastSessionCompletedAt?: number;
}

/** Only a mirror with all three setting fields is usable; anything else reads as absent. */
function decodeMirror(raw: unknown): SmartReminderMirror | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { hour, minute, enabled, lastSessionCompletedAt } = raw as Partial<
    Record<keyof SmartReminderMirror, unknown>
  >;
  if (typeof hour !== 'number' || typeof minute !== 'number' || typeof enabled !== 'boolean') {
    return null;
  }
  return {
    hour,
    minute,
    enabled,
    lastSessionCompletedAt:
      typeof lastSessionCompletedAt === 'number' ? lastSessionCompletedAt : undefined,
  };
}

const mirrorStore = createJsonStore<SmartReminderMirror | null>({
  key: STORAGE_KEYS.SMART_REMINDER_PREFS,
  decode: decodeMirror,
  empty: () => null,
  onReadError: () => null,
});

export function readSmartReminderPrefs(): Promise<SmartReminderMirror | null> {
  return mirrorStore.read();
}

export function writeSmartReminderPrefs(prefs: SmartReminderMirror): Promise<void> {
  return mirrorStore.write(prefs);
}
