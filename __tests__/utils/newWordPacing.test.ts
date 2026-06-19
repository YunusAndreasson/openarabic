/**
 * Tests for computeAdaptiveNewLimit — adaptive new-word pacing.
 * Ported from edenmind's new-card-pacing tests, adapted to the local
 * `recall`/RecentRecall shape and jest.
 */

import { describe, expect, test } from '@jest/globals';

import { NEW_WORD_PACING } from '@/constants/fsrs';
import {
  computeAdaptiveNewLimit,
  type AdaptiveNewLimitInput,
  type RecentRecall,
} from '@/utils/newWordPacing';

// A recall reading; `trials` defaults above the evidence gate so each test
// exercises a band rather than the warming-up path.
const recall = (rate: number, trials = 50): RecentRecall => ({ recall: rate, trials });

// A healthy learner on a 0.9 target — each test overrides just what it exercises.
const input = (over: Partial<AdaptiveNewLimitInput> = {}): AdaptiveNewLimitInput => ({
  ceiling: 20,
  recall: recall(0.96),
  desiredRetention: 0.9,
  ...over,
});

describe('computeAdaptiveNewLimit', () => {
  test('keeps the full ceiling before there is enough evidence', () => {
    const r = computeAdaptiveNewLimit(input({ recall: recall(0.5, 10) }));
    expect(r.status).toBe('warming-up');
    expect(r.effective).toBe(20);
    expect(r.recall).toBeUndefined();
    expect(r.gap).toBeUndefined();
  });

  test('gives the full ceiling when recall is on target', () => {
    const r = computeAdaptiveNewLimit(input({ recall: recall(0.96) }));
    expect(r.status).toBe('full');
    expect(r.effective).toBe(20);
  });

  test.each([
    [10, 5],
    [20, 10],
    [40, 20],
  ])('eases a ceiling of %i to %i when recall is dipping', (ceiling, expected) => {
    // 83% vs 90% target → 7pt gap → reduced band.
    const r = computeAdaptiveNewLimit(input({ ceiling, recall: recall(0.83) }));
    expect(r.status).toBe('reduced');
    expect(r.effective).toBe(expected);
  });

  test('pauses new words when recall is struggling', () => {
    // 70% vs 90% target → 20pt gap → paused.
    const r = computeAdaptiveNewLimit(input({ recall: recall(0.7) }));
    expect(r.status).toBe('paused');
    expect(r.effective).toBe(0);
    expect(r.gap).toBeCloseTo(0.2);
  });

  test('leaves an unlimited ceiling unlimited while recall holds', () => {
    const r = computeAdaptiveNewLimit(input({ ceiling: Infinity, recall: recall(0.83) }));
    expect(r.status).toBe('unlimited');
    expect(r.effective).toBe(Infinity);
  });

  test('pauses even an unlimited ceiling when recall is critical', () => {
    const r = computeAdaptiveNewLimit(input({ ceiling: Infinity, recall: recall(0.7) }));
    expect(r.status).toBe('paused');
    expect(r.effective).toBe(0);
  });

  test('keeps a trickle of one when halving a ceiling of one', () => {
    const r = computeAdaptiveNewLimit(input({ ceiling: 1, recall: recall(0.83) }));
    expect(r.status).toBe('reduced');
    expect(r.effective).toBe(1);
  });

  test('measures the gap against the desired retention, not a fixed 90%', () => {
    // 85% recall is healthy for a relaxed (85%) target → full ceiling.
    const relaxed = computeAdaptiveNewLimit(
      input({ recall: recall(0.85), desiredRetention: 0.85 }),
    );
    expect(relaxed.status).toBe('full');
    // …but a touch under for a thorough (95%) target (10pt gap) → reduced.
    const thorough = computeAdaptiveNewLimit(
      input({ recall: recall(0.85), desiredRetention: 0.95 }),
    );
    expect(thorough.status).toBe('reduced');
  });

  test('keeps the documented thresholds', () => {
    expect(NEW_WORD_PACING.MIN_TRIALS).toBe(20);
    expect(NEW_WORD_PACING.REDUCE_GAP).toBe(0.05);
    expect(NEW_WORD_PACING.PAUSE_GAP).toBe(0.15);
  });
});
