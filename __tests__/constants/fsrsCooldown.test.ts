/**
 * The session-cooldown rule, stated once for the server filter, its client
 * mirror (filterDueWords) and the reminder planner.
 */

import { describe, expect, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import {
  COOLDOWN_EXEMPT_STATES,
  isCooldownExemptState,
  isSessionCooldownActive,
  isShortStepState,
  SHORT_STEP_STATES,
} from '@/constants/fsrs';
import { MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';

describe('session cooldown', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');

  test('is in force for the given hours after a session, and not after', () => {
    expect(isSessionCooldownActive(now - MILLISECONDS_PER_HOUR, 2, now)).toBe(true);
    expect(isSessionCooldownActive(now - 2 * MILLISECONDS_PER_HOUR, 2, now)).toBe(false);
    expect(isSessionCooldownActive(now - 3 * MILLISECONDS_PER_HOUR, 2, now)).toBe(false);
  });

  test('is never in force without a completed session', () => {
    expect(isSessionCooldownActive(undefined, 2, now)).toBe(false);
  });

  // The server filter interpolates this list: (0,1,3).
  test('exempts New and both short-step states, and nothing else', () => {
    expect([...COOLDOWN_EXEMPT_STATES]).toEqual([State.New, State.Learning, State.Relearning]);
    expect([...SHORT_STEP_STATES]).toEqual([State.Learning, State.Relearning]);
    expect(COOLDOWN_EXEMPT_STATES.join(',')).toBe('0,1,3');

    expect(isCooldownExemptState(State.New)).toBe(true);
    expect(isCooldownExemptState(State.Relearning)).toBe(true);
    expect(isCooldownExemptState(State.Review)).toBe(false);
    expect(isCooldownExemptState(null)).toBe(false);
    expect(isShortStepState(State.Learning)).toBe(true);
    expect(isShortStepState(State.New)).toBe(false);
  });
});
