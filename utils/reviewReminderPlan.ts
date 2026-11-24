import type { NotificationRequest } from 'expo-notifications';

import type { PlannedNotification } from '@/utils/notificationPlanner';

export const REMINDER_CHANNEL = 'reminders';

export interface ReminderAccess {
  full: boolean;
  channel: boolean;
  canAskAgain: boolean;
  raw: string;
}

export interface ReminderObservation {
  access: ReminderAccess;
  enabled: boolean;
  revision: string;
  times: number[];
  result: 'verified' | 'restricted' | 'empty' | 'error' | 'disabled';
}

export function reminderRevision(plan: PlannedNotification[], completedAt?: number) {
  // The planner's horizon is bounded. Identical effective plans must compare
  // equal across foreground and headless runtimes, including across restarts.
  const signature = [
    completedAt ?? 0,
    ...plan.map(p =>
      [p.identifier, +p.fireDate, p.wordCount, p.badgeCount, p.sampleWord?.rootId ?? 0].join('/'),
    ),
  ].join('|');
  // An opaque, bounded analytics dimension keeps root IDs out of events.
  let hash = 2166136261;
  for (const char of signature) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Expo's JS union describes scheduling inputs; the OS enumerates native output records.
function matchesTrigger(trigger: unknown, fire: Date) {
  if (!record(trigger) || trigger['repeats'] === true) return false;
  if (trigger['type'] === 'date')
    return trigger['value'] === +fire && trigger['channelId'] === REMINDER_CHANNEL;
  const dc = trigger['dateComponents'];
  if (trigger['type'] !== 'calendar' || !record(dc)) return false;
  return (
    (dc['timeZone'] === 'UTC' || dc['timeZone'] === 'GMT') &&
    dc['year'] === fire.getUTCFullYear() &&
    dc['month'] === fire.getUTCMonth() + 1 &&
    dc['day'] === fire.getUTCDate() &&
    dc['hour'] === fire.getUTCHours() &&
    dc['minute'] === fire.getUTCMinutes() &&
    dc['second'] === fire.getUTCSeconds()
  );
}

export function verifiedReminderTimes(
  owner: string,
  revision: string,
  plan: PlannedNotification[],
  pending: NotificationRequest[],
  now: number,
) {
  return plan
    .filter(
      slot =>
        +slot.fireDate > now &&
        pending.some(
          request =>
            request.identifier === slot.identifier &&
            request.content.data?.['reminderOwner'] === owner &&
            request.content.data['planRevision'] === revision &&
            matchesTrigger(request.trigger, slot.fireDate),
        ),
    )
    .map(slot => +slot.fireDate)
    .sort((a, b) => a - b);
}
