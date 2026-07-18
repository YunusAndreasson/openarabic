/**
 * timeUntilRetrievability — closed-form inversion of the FSRS forgetting curve
 *
 * The round-trip property is the load-bearing test: if a ts-fsrs upgrade
 * changes the curve (e.g. FSRS-6 per-deck decay w[20]), the inversion and the
 * library must still agree, or this suite fails loudly.
 */

import { describe, expect, test } from '@jest/globals';
import { forgetting_curve, generatorParameters } from 'ts-fsrs';

import { OPTIMIZED_FSRS_CONFIG } from '../../constants/fsrs';
import { timeUntilRetrievability } from '../../utils/fsrsUtils';

const FSRS_W = generatorParameters(OPTIMIZED_FSRS_CONFIG).w;

describe('timeUntilRetrievability', () => {
  test('round-trips through the library forgetting curve', () => {
    const stabilities = [0.5, 1, 7, 30, 180];
    const thresholds = [0.95, 0.9, 0.7, 0.5];

    for (const stability of stabilities) {
      for (const threshold of thresholds) {
        const days = timeUntilRetrievability(stability, threshold);
        expect(days).not.toBeNull();
        const roundTripped = forgetting_curve(FSRS_W, days as number, stability);
        expect(roundTripped).toBeCloseTo(threshold, 4);
      }
    }
  });

  test('R = 0.9 at t = S by definition of stability', () => {
    expect(timeUntilRetrievability(10, 0.9)).toBeCloseTo(10, 4);
  });

  test('time to threshold grows as the threshold drops', () => {
    const toCritical = timeUntilRetrievability(10, 0.7) as number;
    const toUrgent = timeUntilRetrievability(10, 0.5) as number;
    expect(toCritical).toBeGreaterThan(10);
    expect(toUrgent).toBeGreaterThan(toCritical);
  });

  test('scales linearly with stability', () => {
    const t1 = timeUntilRetrievability(1, 0.7) as number;
    const t30 = timeUntilRetrievability(30, 0.7) as number;
    expect(t30 / t1).toBeCloseTo(30, 6);
  });

  test('returns null for meaningless inputs', () => {
    expect(timeUntilRetrievability(0, 0.7)).toBeNull();
    expect(timeUntilRetrievability(-1, 0.7)).toBeNull();
    expect(timeUntilRetrievability(10, 0)).toBeNull();
    expect(timeUntilRetrievability(10, 1)).toBeNull();
    expect(timeUntilRetrievability(10, 1.2)).toBeNull();
  });
});
