import type { Href } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';

/**
 * Smart SRS notification planning configuration.
 * The planner emits at most one notification per day, delivered at the user's
 * preferred time, only on days when words are actually due or slipping.
 */
export const SMART_NOTIFICATIONS = {
  /** How many days ahead the local notification plan is computed */
  HORIZON_DAYS: 5,
  /** Minimum due words at a slot for an srs-due notification */
  MIN_DUE_WORDS: 1,
  /** Minimum slipping words at a slot for an srs-slipping notification */
  MIN_SLIPPING_WORDS: 1,
  /** Up to this many slipping words, copy names the most at-risk word */
  WORD_COPY_MAX_SLIPPING: 3,
  /** Minimum spacing between two scheduled notifications */
  MIN_GAP_HOURS: 6,
  /** Never schedule a slot closer to now than this */
  MIN_LEAD_MINUTES: 15,
  /** No notifications between START and END; slots inside snap to END */
  QUIET_HOURS: { START: 22, END: 9 },
  /** Identifier prefix for all smart-scheduled notifications */
  IDENTIFIER_PREFIX: 'srs-',
} as const;

export const NOTIFICATION_TYPES = {
  /** Legacy static daily reminder — kept for routing taps from pre-upgrade notifications */
  DAILY_REMINDER: 'study-reminder',
  SRS_DUE: 'srs-due',
  SRS_SLIPPING: 'srs-slipping',
} as const;

export type SmartNotificationType =
  typeof NOTIFICATION_TYPES.SRS_DUE | typeof NOTIFICATION_TYPES.SRS_SLIPPING;

export type AnyNotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Tap destination per notification type. Slipping words are by construction
 * long overdue (R ≤ 0.7 with a 0.90 retention target), so they are always in
 * the due queue — the Practice tab is the correct single target for all types.
 */
export const NOTIFICATION_ROUTE_BY_TYPE: Record<AnyNotificationType, Href> = {
  [NOTIFICATION_TYPES.DAILY_REMINDER]: ROUTE_PATHS.PRACTICE_TAB,
  [NOTIFICATION_TYPES.SRS_DUE]: ROUTE_PATHS.PRACTICE_TAB,
  [NOTIFICATION_TYPES.SRS_SLIPPING]: ROUTE_PATHS.PRACTICE_TAB,
};
