/**
 * Tests for the within-session drill policy. Ported from edenmind's
 * review-drill tests, adapted to jest.
 */

import { describe, expect, test } from '@jest/globals';

import { decideDrill, DEFAULT_DRILL_POLICY, type DrillProgress } from '@/utils/review/drillPolicy';

const P = DEFAULT_DRILL_POLICY;

describe('within-session drill policy', () => {
  test('graduates a never-missed word on a correct recall (no drilling)', () => {
    expect(decideDrill(null, false)).toEqual({ requeue: false, lag: 0, next: null });
  });

  test('re-asks a fresh miss soon, resetting the streak', () => {
    expect(decideDrill(null, true)).toEqual({
      requeue: true,
      lag: P.lagAfterMiss,
      next: { correctStreak: 0, reasks: 1 },
    });
  });

  test('re-asks a mid-drill correct at the wider lag until the criterion is met', () => {
    // First correct after a miss: not yet graduated (criterion 2) → re-ask, wider lag.
    expect(decideDrill({ correctStreak: 0, reasks: 1 }, false)).toEqual({
      requeue: true,
      lag: P.lagAfterCorrect,
      next: { correctStreak: 1, reasks: 2 },
    });
    // Second correct: criterion reached → graduate.
    expect(decideDrill({ correctStreak: 1, reasks: 2 }, false)).toEqual({
      requeue: false,
      lag: 0,
      next: null,
    });
  });

  test('walks a clean miss → correct → correct path in exactly two reinsertions', () => {
    let prog: DrillProgress | null = null;
    const lags: number[] = [];
    // miss
    let d = decideDrill(prog, true);
    if (d.requeue) lags.push(d.lag);
    prog = d.next;
    // correct
    d = decideDrill(prog, false);
    if (d.requeue) lags.push(d.lag);
    prog = d.next;
    // correct → graduate
    d = decideDrill(prog, false);
    expect(d.requeue).toBe(false);
    expect(lags).toEqual([P.lagAfterMiss, P.lagAfterCorrect]);
  });

  test('resets the correct-streak when a mid-drill word is missed again', () => {
    expect(decideDrill({ correctStreak: 1, reasks: 2 }, true)).toEqual({
      requeue: true,
      lag: P.lagAfterMiss,
      next: { correctStreak: 0, reasks: 3 },
    });
  });

  test('stops drilling once the re-ask cap is reached, so a stuck word cannot trap', () => {
    const atCap: DrillProgress = { correctStreak: 0, reasks: P.maxReasks };
    expect(decideDrill(atCap, true)).toEqual({ requeue: false, lag: 0, next: null });
    expect(decideDrill(atCap, false)).toEqual({ requeue: false, lag: 0, next: null });
  });

  test('honours a custom policy (criterion 1 graduates on the first correct)', () => {
    const policy = { ...P, criterion: 1 };
    expect(decideDrill({ correctStreak: 0, reasks: 1 }, false, policy)).toEqual({
      requeue: false,
      lag: 0,
      next: null,
    });
  });
});
