import { HORIZON_TRAVEL } from '@/constants/animation';
import type { RootId } from '@/types/branded.types';
import { BIN_COUNT, dotCenter, getHorizonBinIndex } from '@/utils/horizonBandPath';

/**
 * Which dots of the memory constellation travel when the collection changes,
 * and where each one goes.
 *
 * The constellation is a unit chart: a dot is a word, placed by how long that
 * word holds. A review changes how long a word holds, so the honest picture of
 * a session is those dots — and only those — moving along the axis. Redrawing
 * the field in its new shape says the same thing with the journey cut out.
 *
 * Pure, and kept away from the component, so the rule that matters most can be
 * tested without a Skia surface: a word that was not reviewed must not move.
 */

export interface DotSlot {
  x: number;
  y: number;
}

/**
 * One travelling dot. `from: null` is a word with no dot before (practised for
 * the first time), `to: null` one with no dot after (removed, or reset).
 */
export interface DotMover {
  from: DotSlot | null;
  to: DotSlot | null;
}

export interface DotTravelPlan {
  /** Dots that keep their place. Drawn once, never recomputed. */
  stayers: DotSlot[];
  /** Dots that travel, ordered by where they leave from, left to right. */
  movers: DotMover[];
}

/** The part of a distribution the constellation is drawn from. */
export interface DotField {
  bins: readonly number[];
  wordsPerDot: number;
  horizonByRootId: ReadonlyMap<RootId, number>;
}

// Read into a module-level primitive because `departureShare` runs on the UI
// thread: the config object also carries easing functions, which have no
// business being copied there for the sake of one number.
const STAGGER = HORIZON_TRAVEL.STAGGER;

/**
 * Where in the sweep a dot sets off, by its place in the departure order.
 *
 * The one definition of the stagger. The drawing reads it every frame and the
 * haptics read it once to find when each dot lands, so the ticks cannot drift
 * off the dots they belong to.
 */
export function departureShare(index: number, count: number): number {
  'worklet';
  return count > 1 ? (index / (count - 1)) * STAGGER : 0;
}

const dotsIn = (count: number, wordsPerDot: number): number =>
  Math.ceil(count / Math.max(1, wordsPerDot));

/**
 * Every dot of a field that is simply drawn: each column filled from the
 * bottom. The same picture a travel plan starts from and ends on, and built
 * here beside the plans so the two can never round a column differently — a
 * dot that exists in one layout and not the other pops at the handover.
 */
export function layOutDots(field: Pick<DotField, 'bins' | 'wordsPerDot'>): DotSlot[] {
  const slots: DotSlot[] = [];
  field.bins.forEach((count, bin) => {
    const dots = dotsIn(count, field.wordsPerDot);
    for (let depth = 0; depth < dots; depth++) slots.push(dotCenter(bin, depth));
  });
  return slots;
}

/** Left to right, and within a column bottom to top: the order dots leave in. */
const byDeparture = (a: DotMover, b: DotMover): number => {
  const first = a.from ?? a.to;
  const second = b.from ?? b.to;
  if (!first || !second) return 0;
  return first.x - second.x || second.y - first.y;
};

/**
 * One dot per word: the dots that travel are exactly the words whose horizon
 * changed.
 *
 * Untouched words fill each column from the bottom in both layouts, so they
 * never shift. A touched word leaves from the top of its old column and lands
 * on top of its new one — including when the two are the same column, where it
 * lifts and settles in place: it was reviewed, and that should be visible even
 * when the gain was too small to cross a column boundary.
 */
function planByWord(previous: DotField, next: DotField): DotTravelPlan {
  const stayersPerBin = new Array<number>(BIN_COUNT).fill(0);
  const touched: { from: number | null; to: number | null }[] = [];

  for (const [id, days] of previous.horizonByRootId) {
    const nextDays = next.horizonByRootId.get(id);
    const from = getHorizonBinIndex(days);
    if (nextDays === days) {
      stayersPerBin[from] = (stayersPerBin[from] ?? 0) + 1;
    } else {
      touched.push({ from, to: nextDays === undefined ? null : getHorizonBinIndex(nextDays) });
    }
  }
  for (const [id, days] of next.horizonByRootId) {
    if (!previous.horizonByRootId.has(id)) {
      touched.push({ from: null, to: getHorizonBinIndex(days) });
    }
  }

  const stayers: DotSlot[] = [];
  stayersPerBin.forEach((count, bin) => {
    for (let depth = 0; depth < count; depth++) stayers.push(dotCenter(bin, depth));
  });

  // Each column's travelling dots stack above its stayers, in both layouts.
  const leaving = [...stayersPerBin];
  const arriving = [...stayersPerBin];
  const take = (depths: number[], bin: number | null): DotSlot | null => {
    if (bin === null) return null;
    const depth = depths[bin] ?? 0;
    depths[bin] = depth + 1;
    return dotCenter(bin, depth);
  };

  const movers = touched.map(move => ({
    from: take(leaving, move.from),
    to: take(arriving, move.to),
  }));

  return { stayers, movers: movers.sort(byDeparture) };
}

/**
 * A dot stands for several words, so a dot is not a word and cannot follow
 * one. What can still be shown truthfully is the net flow: columns that lost
 * dots hand them, left to right, to the columns that gained them.
 */
function planByFlow(previous: DotField, next: DotField): DotTravelPlan {
  const stayers: DotSlot[] = [];
  const leavers: DotSlot[] = [];
  const arrivers: DotSlot[] = [];

  for (let bin = 0; bin < BIN_COUNT; bin++) {
    const before = dotsIn(previous.bins[bin] ?? 0, previous.wordsPerDot);
    const after = dotsIn(next.bins[bin] ?? 0, next.wordsPerDot);
    const staying = Math.min(before, after);

    for (let depth = 0; depth < staying; depth++) stayers.push(dotCenter(bin, depth));
    for (let depth = staying; depth < before; depth++) leavers.push(dotCenter(bin, depth));
    for (let depth = staying; depth < after; depth++) arrivers.push(dotCenter(bin, depth));
  }

  const movers: DotMover[] = [];
  for (let index = 0; index < Math.max(leavers.length, arrivers.length); index++) {
    movers.push({ from: leavers[index] ?? null, to: arrivers[index] ?? null });
  }

  return { stayers, movers };
}

/**
 * The travel from one field to the next, or `null` when there is no honest
 * journey to draw and the field should simply be redrawn:
 *
 * - nothing was drawn before, so there is nowhere to travel from;
 * - the dot scale changed, so a dot no longer means what it meant;
 * - too much moved at once for individual arcs to say anything.
 */
export function planDotTravel(previous: DotField, next: DotField): DotTravelPlan | null {
  if (previous.wordsPerDot !== next.wordsPerDot) return null;
  if (previous.horizonByRootId.size === 0) return null;

  const plan = next.wordsPerDot === 1 ? planByWord(previous, next) : planByFlow(previous, next);

  return plan.movers.length > HORIZON_TRAVEL.MAX_MOVERS ? null : plan;
}
