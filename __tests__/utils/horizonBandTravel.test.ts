/**
 * Which dots of the memory constellation travel after a change.
 *
 * The rule the whole animation rests on is the first one here: a word that was
 * not reviewed does not move. The constellation dims everything that stays and
 * lets the rest travel, so a plan that shuffled an untouched dot would be
 * telling the learner that a word they never saw had changed.
 */

import { describe, expect, test } from '@jest/globals';

import { rootId } from '@/__tests__/helpers/ids';
import { HORIZON_TRAVEL } from '@/constants/animation';
import type { RootId } from '@/types/branded.types';
import { BIN_COUNT, dotCenter, getHorizonBinIndex } from '@/utils/horizonBandPath';
import { planDotTravel, type DotField, type DotSlot } from '@/utils/horizonBandTravel';

/** A field with one dot per word, built from `[word, horizon in days]` pairs. */
const fieldOf = (words: [number, number][]): DotField => {
  const bins = new Array<number>(BIN_COUNT).fill(0);
  const horizonByRootId = new Map<RootId, number>();
  for (const [id, days] of words) {
    const bin = getHorizonBinIndex(days);
    bins[bin] = (bins[bin] ?? 0) + 1;
    horizonByRootId.set(rootId(id), days);
  }
  return { bins, wordsPerDot: 1, horizonByRootId };
};

/** A field too large for one dot per word: only its column counts matter. */
const scaledField = (counts: number[], wordsPerDot: number): DotField => {
  const bins = new Array<number>(BIN_COUNT).fill(0);
  counts.forEach((count, bin) => {
    bins[bin] = count;
  });
  // The flow plan reads columns, not words; the map only has to be non-empty.
  return { bins, wordsPerDot, horizonByRootId: new Map([[rootId(1), 1]]) };
};

/** Every dot a field draws: each column filled from the bottom. */
const drawnSlots = (field: DotField): DotSlot[] =>
  field.bins.flatMap((count, bin) =>
    Array.from({ length: Math.ceil(count / field.wordsPerDot) }, (_, depth) =>
      dotCenter(bin, depth),
    ),
  );

const sorted = (slots: (DotSlot | null)[]): DotSlot[] =>
  slots.filter((slot): slot is DotSlot => slot !== null).sort((a, b) => a.x - b.x || a.y - b.y);

describe('planDotTravel', () => {
  test('a word that was not reviewed does not move', () => {
    const before = fieldOf([
      [1, 2],
      [2, 2],
      [3, 40],
      [4, 200],
    ]);
    // Only word 2 was reviewed.
    const after = fieldOf([
      [1, 2],
      [2, 40],
      [3, 40],
      [4, 200],
    ]);

    const plan = planDotTravel(before, after);

    expect(plan?.movers).toHaveLength(1);
    expect(plan?.stayers).toHaveLength(3);
    // Each of the three keeps the exact slot it was drawn in: bottom of its
    // own column, in both layouts.
    expect(sorted(plan?.stayers ?? [])).toEqual(
      sorted([
        dotCenter(getHorizonBinIndex(2), 0),
        dotCenter(getHorizonBinIndex(40), 0),
        dotCenter(getHorizonBinIndex(200), 0),
      ]),
    );
  });

  test('nothing reviewed: every dot stays and none travels', () => {
    const words: [number, number][] = [
      [1, 3],
      [2, 3],
      [3, 90],
    ];

    const plan = planDotTravel(fieldOf(words), fieldOf(words));

    expect(plan?.movers).toEqual([]);
    expect(sorted(plan?.stayers ?? [])).toEqual(sorted(drawnSlots(fieldOf(words))));
  });

  test('a reviewed word travels right, to the top of the column it now holds in', () => {
    const before = fieldOf([
      [1, 2],
      [2, 60],
    ]);
    const after = fieldOf([
      [1, 60],
      [2, 60],
    ]);

    const [mover] = planDotTravel(before, after)?.movers ?? [];

    expect(mover?.from).toEqual(dotCenter(getHorizonBinIndex(2), 0));
    // Word 2 was already there and did not move, so the arrival stacks on it.
    expect(mover?.to).toEqual(dotCenter(getHorizonBinIndex(60), 1));
  });

  test('a lapse travels left', () => {
    const before = fieldOf([[1, 120]]);
    const after = fieldOf([[1, 1]]);

    const [mover] = planDotTravel(before, after)?.movers ?? [];

    expect(mover?.from?.x).toBeGreaterThan(mover?.to?.x ?? Infinity);
  });

  test('a review too small to change column still lifts its dot in place', () => {
    // The precondition this case rests on: both horizons share a column.
    expect(getHorizonBinIndex(30)).toBe(getHorizonBinIndex(30.01));

    const plan = planDotTravel(fieldOf([[1, 30]]), fieldOf([[1, 30.01]]));

    expect(plan?.stayers).toEqual([]);
    expect(plan?.movers).toEqual([
      { from: dotCenter(getHorizonBinIndex(30), 0), to: dotCenter(getHorizonBinIndex(30), 0) },
    ]);
  });

  test('a first-practised word appears, and a removed one leaves', () => {
    const before = fieldOf([
      [1, 5],
      [2, 80],
    ]);
    const after = fieldOf([
      [1, 5],
      [3, 1],
    ]);

    const movers = planDotTravel(before, after)?.movers ?? [];

    expect(movers).toHaveLength(2);
    expect(movers).toContainEqual({ from: null, to: dotCenter(getHorizonBinIndex(1), 0) });
    expect(movers).toContainEqual({ from: dotCenter(getHorizonBinIndex(80), 0), to: null });
  });

  test('the plan starts as the old picture and ends as the new one', () => {
    const before = fieldOf([
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 30],
      [5, 300],
    ]);
    const after = fieldOf([
      [1, 2],
      [2, 30],
      [3, 300],
      [4, 9],
      [5, 300],
    ]);

    const plan = planDotTravel(before, after);
    const stayers = plan?.stayers ?? [];
    const movers = plan?.movers ?? [];

    // No gap and no overlap at either end: a dot popping at the first or last
    // frame is exactly what the travel exists to remove.
    expect(sorted([...stayers, ...movers.map(mover => mover.from)])).toEqual(
      sorted(drawnSlots(before)),
    );
    expect(sorted([...stayers, ...movers.map(mover => mover.to)])).toEqual(
      sorted(drawnSlots(after)),
    );
  });

  test('dots leave in order, left to right', () => {
    const before = fieldOf([
      [1, 200],
      [2, 2],
      [3, 30],
    ]);
    const after = fieldOf([
      [1, 300],
      [2, 9],
      [3, 90],
    ]);

    const departures = (planDotTravel(before, after)?.movers ?? []).map(mover => mover.from?.x);

    expect(departures).toEqual([...departures].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  describe('when a dot stands for several words', () => {
    test('columns that lost dots hand them to the columns that gained them', () => {
      // Two words per dot: column 0 goes from two dots to one, column 1 from
      // none to one.
      const plan = planDotTravel(scaledField([4, 0], 2), scaledField([2, 2], 2));

      expect(plan?.stayers).toEqual([dotCenter(0, 0)]);
      expect(plan?.movers).toEqual([{ from: dotCenter(0, 1), to: dotCenter(1, 0) }]);
    });

    test('a dot with no counterpart appears or leaves on its own', () => {
      const grown = planDotTravel(scaledField([2, 0], 2), scaledField([2, 2], 2));
      expect(grown?.movers).toEqual([{ from: null, to: dotCenter(1, 0) }]);

      const shrunk = planDotTravel(scaledField([2, 2], 2), scaledField([2, 0], 2));
      expect(shrunk?.movers).toEqual([{ from: dotCenter(1, 0), to: null }]);
    });
  });

  describe('when there is no honest journey to draw', () => {
    test('nothing was drawn before', () => {
      expect(planDotTravel(fieldOf([]), fieldOf([[1, 4]]))).toBeNull();
    });

    test('the dot scale changed, so a dot no longer means what it meant', () => {
      expect(planDotTravel(scaledField([40], 2), scaledField([40], 3))).toBeNull();
    });

    test('too much moved at once', () => {
      const count = HORIZON_TRAVEL.MAX_MOVERS + 1;
      const before = fieldOf(Array.from({ length: count }, (_, id) => [id, 2]));
      const after = fieldOf(Array.from({ length: count }, (_, id) => [id, 90]));

      expect(planDotTravel(before, after)).toBeNull();
    });
  });
});
