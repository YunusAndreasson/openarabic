import { HORIZON_TRAVEL } from '@/constants/animation';
import { departureShare, type DotMover } from '@/utils/horizonBandTravel';

/**
 * What a session feels like as its dots land in the memory constellation.
 *
 * One tick per landing, and one firmer beat as the last dot seats. The ticks
 * follow the dots, so the hand gets the same account of the session the eye
 * does: three words are three taps with air between them, sixty are a roll.
 *
 * Pure, and kept beside the travel plan it reads, so the rules can be tested
 * without a device: the number of beats is bounded by time and never by the
 * number of words, and a session that lost ground does not close on a beat
 * that says it gained some.
 */

export interface TravelHapticBeat {
  /** Share of the sweep, 0..1, at which the beat fires. */
  at: number;
  /** The closing beat: firmer than a landing tick. At most one, and last. */
  settle: boolean;
}

/**
 * The beats for one travel, in the order they fire.
 *
 * A dot that leaves the field lands nowhere and so is not felt: a word removed
 * or reset is not a reward.
 */
export function planTravelHaptics(movers: readonly DotMover[]): TravelHapticBeat[] {
  const travelShare = 1 - HORIZON_TRAVEL.STAGGER;
  const minGap = HORIZON_TRAVEL.HAPTIC_MIN_GAP / HORIZON_TRAVEL.SWEEP.duration;

  const landings: number[] = [];
  let forward = 0;
  let backward = 0;

  movers.forEach((mover, index) => {
    if (!mover.to) return;
    landings.push(departureShare(index, movers.length) + HORIZON_TRAVEL.LANDED_AT * travelShare);

    // A word practised for the first time has gained a place, which is forward.
    // One that lifted and settled in its own column is neither.
    if (!mover.from || mover.to.x > mover.from.x) forward += 1;
    else if (mover.to.x < mover.from.x) backward += 1;
  });

  const finalLanding = landings[landings.length - 1];
  if (finalLanding === undefined) return [];

  // Landings closer together than a hand can tell apart share a tick.
  const ticks: number[] = [];
  for (const at of landings) {
    const last = ticks[ticks.length - 1];
    if (last === undefined || at - last >= minGap) ticks.push(at);
  }
  // The stream ends when the last dot lands, not a fraction of a gap before.
  ticks[ticks.length - 1] = finalLanding;

  // The closing beat reports that memory grew. When more words fell back than
  // moved on, the stream simply ends.
  const settles = forward > backward;

  return ticks.map((at, index) => ({ at, settle: settles && index === ticks.length - 1 }));
}
