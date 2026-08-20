/**
 * How many times a word has actually been asked — the breakdown behind the
 * practice screen's "Reviews done" tile.
 *
 * The tile is `Σ fsrs_reps`, so this partitions words by **that same column**
 * and nothing else. That coupling is the whole point: any other cut (state,
 * stability, "practised") produces a sheet whose rows do not add up to the
 * number the learner tapped. `hasBeenPractised` is deliberately NOT used here —
 * it additionally requires `fsrs_state !== New`, so a word could be excluded
 * from the breakdown while its reps were still counted in the total.
 *
 * A snapshot, and only a snapshot. There is no review log — `study_words` holds
 * current FSRS state and `fsrs_last_review` is a single column every review
 * overwrites — so "how many reviews did I do last Tuesday" is not a question
 * this data can answer. What it can answer exactly is how deep the practice on
 * each word currently runs, which is what this file is.
 */

import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Ordered LEAST-practised first, with `none` last.
 *
 * One rule for both breakdown sheets: ascending, residual row at the bottom.
 * The memory sheet's order is not free — `HORIZON_BAND_KEYS` runs
 * days → weeks → months → year because that is the left-to-right order of the
 * hero constellation's log-time axis, so a band's row meter and its column sit
 * at the same place by construction. This list has no chart above it, so it is
 * the one that moves.
 *
 * It used to run most-practised first, which put two identical-looking
 * `BreakdownRow` lists in front of the learner reading in opposite directions:
 * one leading with the words that need work, one leading with a victory lap.
 * Ascending also matches how the rest of the app leads — `useDictionaryList`
 * defaults to hardest-first and weakest-memory-first.
 *
 * `none` stays last for the same reason "Not started" is last in the memory
 * sheet: it is the row with no reviews behind it at all, and it is kept off the
 * shared axis rather than drawn at zero.
 */
export const DEPTH_BAND_KEYS = ['once', 'few', 'solid', 'deep', 'none'] as const;

export type DepthBandKey = (typeof DEPTH_BAND_KEYS)[number];

/**
 * Band floors, in reps. Round numbers rather than anything derived: unlike the
 * horizon bands — whose boundaries are `formatHorizon`'s own unit cuts — there
 * is no other surface that renders a rep count in bands, so there is nothing to
 * stay aligned with. They are named here so the labels below cannot drift from
 * the predicate.
 */
const DEEP_MIN_REPS = 10;
const SOLID_MIN_REPS = 5;
const FEW_MIN_REPS = 2;

export const DEPTH_BAND_LABELS: Record<DepthBandKey, string> = {
  deep: STRINGS.DEPTH_BAND_DEEP,
  solid: STRINGS.DEPTH_BAND_SOLID,
  few: STRINGS.DEPTH_BAND_FEW,
  once: STRINGS.DEPTH_BAND_ONCE,
  none: STRINGS.DEPTH_BAND_NONE,
};

/**
 * What each band MEANS, not what it spans.
 *
 * The opposite of `HORIZON_BAND_HINTS`, and for a concrete reason: a horizon
 * band is called "Weeks" and has to say what that covers, whereas a depth band
 * is called "5–9 times" and already has. Repeating the range here would spend a
 * whole caption line saying nothing.
 */
export const DEPTH_BAND_HINTS: Record<DepthBandKey, string> = {
  deep: STRINGS.DEPTH_BAND_HINT_DEEP,
  solid: STRINGS.DEPTH_BAND_HINT_SOLID,
  few: STRINGS.DEPTH_BAND_HINT_FEW,
  once: STRINGS.DEPTH_BAND_HINT_ONCE,
  none: STRINGS.DEPTH_BAND_HINT_NONE,
};

export interface DepthBand {
  key: DepthBandKey;
  label: string;
  count: number;
}

/**
 * Grades this word has been given.
 *
 * Clamped at zero the same way the practice screen clamps its total, so one
 * impossible negative row cannot make the parts disagree with the whole.
 */
export function getWordReps(word: StudyWord): number {
  return Math.max(0, word.fsrs_reps ?? 0);
}

/**
 * Which band an already-clamped rep count falls in.
 *
 * Split from `getWordDepthBand` so a caller that has just read `getWordReps`
 * does not clamp the same field twice — which also keeps the clamp itself at a
 * single call site rather than two that could diverge.
 */
export function getDepthBandForReps(reps: number): DepthBandKey {
  if (reps >= DEEP_MIN_REPS) return 'deep';
  if (reps >= SOLID_MIN_REPS) return 'solid';
  if (reps >= FEW_MIN_REPS) return 'few';
  if (reps >= 1) return 'once';
  return 'none';
}

/**
 * Which band a word falls in. Total, in the mathematical sense: every word gets
 * exactly one band, so the five counts always sum to the vocabulary size.
 */
export function getWordDepthBand(word: StudyWord): DepthBandKey {
  return getDepthBandForReps(getWordReps(word));
}
