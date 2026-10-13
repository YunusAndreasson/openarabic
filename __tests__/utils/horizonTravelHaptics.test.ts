/**
 * What a session feels like as its dots land in the memory constellation.
 *
 * The rule that matters most is the bound: a learner can review hundreds of
 * words in a sitting, and a tick per word would be a motor held on for a second
 * rather than anything a hand can read.
 */

import { describe, expect, test } from '@jest/globals';

import { HORIZON_TRAVEL } from '@/constants/animation';
import type { DotMover } from '@/utils/horizonBandTravel';
import { planTravelHaptics } from '@/utils/horizonTravelHaptics';

const MIN_GAP = HORIZON_TRAVEL.HAPTIC_MIN_GAP / HORIZON_TRAVEL.SWEEP.duration;

/** A dot travelling along the baseline from one x to another. */
const move = (fromX: number, toX: number): DotMover => ({
  from: { x: fromX, y: 0 },
  to: { x: toX, y: 0 },
});

const forwardMovers = (count: number): DotMover[] =>
  Array.from({ length: count }, (_, index) => move(index, index + 100));

describe('planTravelHaptics', () => {
  test('a small session is one tick per word, closed by a settle', () => {
    const beats = planTravelHaptics(forwardMovers(3));

    expect(beats.map(beat => beat.settle)).toEqual([false, false, true]);
  });

  test('a single reviewed word is the settle alone', () => {
    expect(planTravelHaptics(forwardMovers(1))).toEqual([
      { at: HORIZON_TRAVEL.LANDED_AT * (1 - HORIZON_TRAVEL.STAGGER), settle: true },
    ]);
  });

  test('hundreds of words are felt as a bounded roll, not a tick each', () => {
    // The landings span a fixed share of the sweep, so the gap bounds the count.
    const most = Math.floor(HORIZON_TRAVEL.STAGGER / MIN_GAP) + 1;

    for (const words of [20, 40, 80, HORIZON_TRAVEL.MAX_MOVERS]) {
      expect(planTravelHaptics(forwardMovers(words)).length).toBeLessThanOrEqual(most);
    }
    expect(most).toBeLessThan(10);
  });

  test('no two beats are closer than a hand can tell apart', () => {
    const beats = planTravelHaptics(forwardMovers(HORIZON_TRAVEL.MAX_MOVERS));

    beats.slice(1).forEach((beat, index) => {
      const previous = beats[index];
      expect(beat.at - (previous?.at ?? 0)).toBeGreaterThanOrEqual(MIN_GAP);
    });
  });

  test('the stream ends as the last dot lands, inside the sweep', () => {
    const movers = forwardMovers(HORIZON_TRAVEL.MAX_MOVERS);
    const beats = planTravelHaptics(movers);
    const lastLanding =
      HORIZON_TRAVEL.STAGGER + HORIZON_TRAVEL.LANDED_AT * (1 - HORIZON_TRAVEL.STAGGER);

    expect(beats[beats.length - 1]?.at).toBeCloseTo(lastLanding);
    expect(lastLanding).toBeLessThan(1);
  });

  test('a session that lost ground ends without a settle', () => {
    const beats = planTravelHaptics([move(100, 0), move(101, 1), move(0, 100)]);

    expect(beats).toHaveLength(3);
    expect(beats.some(beat => beat.settle)).toBe(false);
  });

  test('a word that lifted and settled in its own column ticks, and tips nothing', () => {
    const beats = planTravelHaptics([move(50, 50)]);

    expect(beats).toHaveLength(1);
    expect(beats[0]?.settle).toBe(false);
  });

  test('a word practised for the first time counts as ground gained', () => {
    const beats = planTravelHaptics([{ from: null, to: { x: 0, y: 0 } }]);

    expect(beats.map(beat => beat.settle)).toEqual([true]);
  });

  test('dots that leave the field land nowhere and are not felt', () => {
    const leaving: DotMover = { from: { x: 0, y: 0 }, to: null };

    expect(planTravelHaptics([leaving, leaving])).toEqual([]);
  });
});
