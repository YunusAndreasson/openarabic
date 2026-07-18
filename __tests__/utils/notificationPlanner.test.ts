/**
 * buildNotificationPlan — pure forward planner for smart SRS reminders
 *
 * All scenarios pass an explicit `now`, so no fake timers are needed.
 * Slip timing is derived from timeUntilRetrievability (round-trip verified in
 * fsrsRetrievabilityInversion.test.ts) so fixtures stay correct across
 * ts-fsrs default-parameter changes.
 */

import { describe, expect, test } from '@jest/globals';

import { CRITICAL_RETRIEVABILITY_THRESHOLD } from '../../constants/fsrs';
import { SMART_NOTIFICATIONS } from '../../constants/notifications';
import type { RootId } from '../../types/branded.types';
import type { StudyWord } from '../../types/vocabulary.types';
import { timeUntilRetrievability } from '../../utils/fsrsUtils';
import { buildNotificationPlan } from '../../utils/notificationPlanner';
import { createTestWord } from '../helpers/fsrsTestHelpers';

const NOW = new Date('2026-07-20T10:00:00');
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days after last review at which a stability-1 word crosses R = 0.7 */
const SLIP_DAYS_S1 = timeUntilRetrievability(1, CRITICAL_RETRIEVABILITY_THRESHOLD) as number;

const defaultInput = {
  now: NOW,
  preferredHour: 19,
  preferredMinute: 0,
};

/** A reviewed word due at `dueOffsetDays` from NOW, far from slipping. */
function dueWord(dueOffsetDays: number, id: number): StudyWord {
  return createTestWord({
    root_id: id as RootId,
    fsrs_state: 2,
    fsrs_reps: 5,
    fsrs_stability: 60, // slips SLIP_DAYS_S1 × 60 days after last review — far outside the horizon
    fsrs_last_review: new Date(NOW.getTime() - 10 * DAY_MS).toISOString(),
    fsrs_due: new Date(NOW.getTime() + dueOffsetDays * DAY_MS).toISOString(),
  });
}

/** A reviewed word already one day past its R = 0.7 slip point (stability 1). */
function slippingWord(id: number, withRoot = false): StudyWord {
  const reviewedDaysAgo = SLIP_DAYS_S1 + 1;
  return createTestWord({
    root_id: id as RootId,
    fsrs_state: 2,
    fsrs_reps: 5,
    fsrs_stability: 1,
    fsrs_last_review: new Date(NOW.getTime() - reviewedDaysAgo * DAY_MS).toISOString(),
    fsrs_due: new Date(NOW.getTime() - (reviewedDaysAgo - 1) * DAY_MS).toISOString(),
    root: withRoot
      ? {
          id,
          letters: 'كِتاب',
          meaning: 'book',
          audio_url: '',
          audio_url_en: '',
        }
      : undefined,
  });
}

describe('buildNotificationPlan', () => {
  test('empty input produces an empty plan', () => {
    expect(buildNotificationPlan({ ...defaultInput, words: [] })).toEqual([]);
  });

  test('nothing due or slipping inside the horizon produces an empty plan', () => {
    const words = [dueWord(30, 1), dueWord(45, 2)];
    expect(buildNotificationPlan({ ...defaultInput, words })).toEqual([]);
  });

  test('due words produce one srs-due per day at the preferred time', () => {
    const words = [1, 2, 3, 4, 5].map(id => dueWord(-1, id));
    const plan = buildNotificationPlan({ ...defaultInput, words });

    expect(plan).toHaveLength(SMART_NOTIFICATIONS.HORIZON_DAYS);
    for (const planned of plan) {
      expect(planned.type).toBe('srs-due');
      expect(planned.wordCount).toBe(5);
      expect(planned.badgeCount).toBe(5);
      expect(planned.fireDate.getHours()).toBe(19);
      expect(planned.fireDate.getMinutes()).toBe(0);
    }
    expect(plan[0]?.identifier).toBe('srs-due-2026-07-20');
    expect(plan[1]?.identifier).toBe('srs-due-2026-07-21');
  });

  test('a single due word is enough to fire', () => {
    const plan = buildNotificationPlan({ ...defaultInput, words: [dueWord(-0.1, 1)] });
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]?.wordCount).toBe(1);
  });

  test('new words (state 0) count as due but never as slipping', () => {
    const newWord = createTestWord({ fsrs_state: 0, fsrs_reps: 0, fsrs_stability: 0.4 });
    const plan = buildNotificationPlan({ ...defaultInput, words: [newWord] });

    expect(plan.length).toBeGreaterThan(0);
    for (const planned of plan) {
      expect(planned.type).toBe('srs-due');
    }
  });

  test('slipping outranks due and carries the sample word', () => {
    const words = [dueWord(-1, 1), dueWord(-1, 2), slippingWord(3, true)];
    const plan = buildNotificationPlan({ ...defaultInput, words });

    expect(plan[0]?.type).toBe('srs-slipping');
    expect(plan[0]?.identifier).toBe('srs-slipping-2026-07-20');
    expect(plan[0]?.wordCount).toBe(1);
    // Badge shows the full due queue (slipping words are due too)
    expect(plan[0]?.badgeCount).toBe(3);
    expect(plan[0]?.sampleWord).toEqual({ rootId: 3, arabic: 'كِتاب', meaning: 'book' });
  });

  test('slipping without a loaded root relation omits the sample word', () => {
    const plan = buildNotificationPlan({ ...defaultInput, words: [slippingWord(1, false)] });
    expect(plan[0]?.type).toBe('srs-slipping');
    expect(plan[0]?.sampleWord).toBeUndefined();
  });

  test('a word becoming due mid-horizon starts firing from its due day', () => {
    // Due 2026-07-22T12:24 — before that day's 19:00 slot, after day 1's
    const words = [dueWord(2.1, 1)];
    const plan = buildNotificationPlan({ ...defaultInput, words });

    expect(plan[0]?.identifier).toBe('srs-due-2026-07-22');
    expect(plan.map(p => p.identifier)).not.toContain('srs-due-2026-07-21');
  });

  test('session cooldown drops the day-0 slot', () => {
    const now = new Date('2026-07-20T18:00:00');
    const words = [1, 2, 3].map(id => dueWord(-1, id));
    const plan = buildNotificationPlan({
      ...defaultInput,
      now,
      words,
      // Completed 17:30 → 2h cooldown runs to 19:30, past today's 19:00 slot
      lastSessionCompletedAt: new Date('2026-07-20T17:30:00').getTime(),
    });

    expect(plan[0]?.identifier).toBe('srs-due-2026-07-21');
  });

  test('a slot already in the past is skipped, not scheduled', () => {
    const now = new Date('2026-07-20T19:30:00');
    const plan = buildNotificationPlan({
      ...defaultInput,
      now,
      words: [dueWord(-1, 1)],
    });

    expect(plan[0]?.identifier).toBe('srs-due-2026-07-21');
  });

  test('preferred time inside quiet hours snaps to the quiet-hours end', () => {
    const plan = buildNotificationPlan({
      ...defaultInput,
      preferredHour: 23,
      preferredMinute: 30,
      words: [dueWord(-1, 1)],
    });

    expect(plan.length).toBeGreaterThan(0);
    for (const planned of plan) {
      expect(planned.fireDate.getHours()).toBe(SMART_NOTIFICATIONS.QUIET_HOURS.END);
    }
    // Day-0's 23:30 slot lands next morning
    expect(plan[0]?.identifier).toBe('srs-due-2026-07-21');
  });

  test('early-morning preferred time snaps forward to the quiet-hours end', () => {
    const now = new Date('2026-07-20T05:00:00');
    const plan = buildNotificationPlan({
      ...defaultInput,
      now,
      preferredHour: 6,
      preferredMinute: 0,
      words: [dueWord(-1, 1)],
    });

    expect(plan[0]?.fireDate.getHours()).toBe(SMART_NOTIFICATIONS.QUIET_HOURS.END);
    expect(plan[0]?.identifier).toBe('srs-due-2026-07-20');
  });

  test('plan is monotone: recomputing a day later yields the same remaining slots', () => {
    const words = [1, 2, 3, 4].map(id => dueWord(-1, id));
    const planToday = buildNotificationPlan({ ...defaultInput, words });
    const planTomorrow = buildNotificationPlan({
      ...defaultInput,
      now: new Date(NOW.getTime() + DAY_MS),
      words,
    });

    const overlapToday = planToday.slice(1);
    const overlapTomorrow = planTomorrow.slice(0, overlapToday.length);
    expect(overlapTomorrow.map(p => p.identifier)).toEqual(overlapToday.map(p => p.identifier));
    expect(overlapTomorrow.map(p => p.wordCount)).toEqual(overlapToday.map(p => p.wordCount));
  });

  test('never plans more than one notification per day', () => {
    const words = [
      ...[1, 2, 3, 4, 5].map(id => dueWord(-1, id)),
      slippingWord(6),
      slippingWord(7),
    ];
    const plan = buildNotificationPlan({ ...defaultInput, words });

    const days = plan.map(p => p.identifier.slice(-10));
    expect(new Set(days).size).toBe(days.length);
    expect(plan.length).toBeLessThanOrEqual(SMART_NOTIFICATIONS.HORIZON_DAYS);
  });
});
