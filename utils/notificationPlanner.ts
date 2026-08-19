import { State } from 'ts-fsrs';

import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  DEFAULT_SESSION_COOLDOWN_HOURS,
} from '@/constants/fsrs';
import { NOTIFICATION_TYPES, SMART_NOTIFICATIONS } from '@/constants/notifications';
import type { SmartNotificationType } from '@/constants/notifications';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_HOUR,
  normalizeTimestamp,
  toLocalDateString,
} from '@/utils/dateTimeUtils';
import { timeUntilRetrievability } from '@/utils/fsrsUtils';

export interface PlannedNotification {
  /** Stable identifier, e.g. `srs-due-2026-07-21` — makes rescheduling idempotent */
  identifier: string;
  type: SmartNotificationType;
  fireDate: Date;
  /** Slipping count for srs-slipping, due count for srs-due */
  wordCount: number;
  /** Projected total due words at fire time — becomes the app badge on delivery */
  badgeCount: number;
  /** Most at-risk slipping word, when its root relation is loaded */
  sampleWord?: { rootId: number; arabic: string; meaning: string };
}

export interface NotificationPlannerInput {
  words: StudyWord[];
  now: Date;
  /** Preferred delivery hour (0-23) from the reminder time setting */
  preferredHour: number;
  preferredMinute: number;
  /** Epoch ms of the last completed review session, if known */
  lastSessionCompletedAt?: number;
}

interface WordTimeline {
  dueMs: number;
  slipMs: number;
  word: StudyWord;
}

/**
 * Per-word timestamps: when it becomes due, and when its retrievability
 * crosses the critical threshold ("slipping"). Both are fixed unless a review
 * happens, which is what makes a precomputed plan self-consistent.
 */
function computeTimelines(words: StudyWord[], nowMs: number): WordTimeline[] {
  return words.map(word => {
    let dueMs = Number.POSITIVE_INFINITY;
    if (word.fsrs_state === State.New) {
      dueMs = nowMs; // New words are always due
    } else {
      const dueStr = normalizeTimestamp(word.fsrs_due);
      if (dueStr) {
        const parsed = Date.parse(dueStr);
        if (!Number.isNaN(parsed)) dueMs = parsed;
      }
    }

    let slipMs = Number.POSITIVE_INFINITY;
    const stability = word.fsrs_stability ?? 0;
    const lastStr = normalizeTimestamp(word.fsrs_last_review);
    if (word.fsrs_state !== State.New && (word.fsrs_reps ?? 0) > 0 && stability > 0 && lastStr) {
      const lastMs = Date.parse(lastStr);
      const slipDays = timeUntilRetrievability(stability, CRITICAL_RETRIEVABILITY_THRESHOLD);
      if (!Number.isNaN(lastMs) && slipDays !== null) {
        slipMs = lastMs + slipDays * MILLISECONDS_PER_DAY;
      }
    }

    return { dueMs, slipMs, word };
  });
}

/**
 * The delivery slot for a given day offset: the preferred time, snapped out of
 * quiet hours (a slot at/after QUIET START moves to QUIET END the next morning;
 * a slot before QUIET END moves to QUIET END the same day).
 */
function slotForDay(now: Date, dayOffset: number, hour: number, minute: number): Date {
  const slot = new Date(now);
  slot.setDate(slot.getDate() + dayOffset);
  slot.setHours(hour, minute, 0, 0);

  const { START, END } = SMART_NOTIFICATIONS.QUIET_HOURS;
  if (slot.getHours() >= START) {
    slot.setDate(slot.getDate() + 1);
    slot.setHours(END, 0, 0, 0);
  } else if (slot.getHours() < END) {
    slot.setHours(END, 0, 0, 0);
  }
  return slot;
}

/**
 * Build the forward plan of smart reminders: at most one notification per
 * horizon day, chosen at each day's delivery slot — slipping words outrank
 * merely-due words. Pure function of its input; no expo imports.
 */
export function buildNotificationPlan(input: NotificationPlannerInput): PlannedNotification[] {
  const { words, now, preferredHour, preferredMinute, lastSessionCompletedAt } = input;
  if (words.length === 0) return [];

  const nowMs = now.getTime();
  const timelines = computeTimelines(words, nowMs);

  const minLeadMs = nowMs + SMART_NOTIFICATIONS.MIN_LEAD_MINUTES * 60 * 1000;
  const cooldownUntilMs =
    lastSessionCompletedAt !== undefined
      ? lastSessionCompletedAt + DEFAULT_SESSION_COOLDOWN_HOURS * MILLISECONDS_PER_HOUR
      : 0;
  const minGapMs = SMART_NOTIFICATIONS.MIN_GAP_HOURS * MILLISECONDS_PER_HOUR;

  const plan: PlannedNotification[] = [];
  let lastKeptMs = Number.NEGATIVE_INFINITY;

  for (let dayOffset = 0; dayOffset < SMART_NOTIFICATIONS.HORIZON_DAYS; dayOffset++) {
    const slot = slotForDay(now, dayOffset, preferredHour, preferredMinute);
    const slotMs = slot.getTime();

    if (slotMs < minLeadMs) continue;
    if (slotMs < cooldownUntilMs) continue;
    if (slotMs - lastKeptMs < minGapMs) continue;

    let dueCount = 0;
    let slippingCount = 0;
    let sample: PlannedNotification['sampleWord'];
    let sampleSlipMs = Number.POSITIVE_INFINITY;

    for (const { dueMs, slipMs, word } of timelines) {
      if (dueMs <= slotMs) dueCount++;
      if (slipMs <= slotMs) {
        slippingCount++;
        if (slipMs < sampleSlipMs && word.root) {
          sampleSlipMs = slipMs;
          sample = { rootId: word.root_id, arabic: word.root.letters, meaning: word.root.meaning };
        }
      }
    }

    let planned: PlannedNotification | null = null;
    if (slippingCount >= SMART_NOTIFICATIONS.MIN_SLIPPING_WORDS) {
      planned = {
        identifier: `${SMART_NOTIFICATIONS.IDENTIFIER_PREFIX}slipping-${toLocalDateString(slot)}`,
        type: NOTIFICATION_TYPES.SRS_SLIPPING,
        fireDate: slot,
        wordCount: slippingCount,
        badgeCount: dueCount,
        sampleWord: sample,
      };
    } else if (dueCount >= SMART_NOTIFICATIONS.MIN_DUE_WORDS) {
      planned = {
        identifier: `${SMART_NOTIFICATIONS.IDENTIFIER_PREFIX}due-${toLocalDateString(slot)}`,
        type: NOTIFICATION_TYPES.SRS_DUE,
        fireDate: slot,
        wordCount: dueCount,
        badgeCount: dueCount,
      };
    }

    if (planned) {
      plan.push(planned);
      lastKeptMs = slotMs;
    }
  }

  return plan;
}
