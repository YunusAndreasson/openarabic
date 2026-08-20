/**
 * What the dictionary row's trailing meter measures — which is whatever the list
 * is currently sorted by.
 *
 * The meter used to be fixed to the memory horizon while the list offered three
 * orderings. That was a defensible design (a fixed encoding is not a mode) but
 * it failed the only test that matters: nothing on the screen ever named the
 * bar, so a learner looking at a sort control directly above it reasonably read
 * the bar as showing the sorted quantity. Two of the three sorts then made the
 * bar look arbitrary. Binding it to the active sort makes the list corroborate
 * its own order under every option, and the sort control sitting immediately
 * above becomes the bar's label.
 *
 * **Length is always the named variable, never an inversion of it.** A bar
 * labelled "Difficulty" has to be longest on the most difficult word; anything
 * else asks the reader to hold a negation in their head that nothing on screen
 * announces. An earlier version inverted difficulty so that a short bar always
 * meant "needs attention" — one consistent rhythm across all three sorts — and
 * it read as plainly broken: the hardest word in the list showed no bar at all
 * while the easiest showed a full one.
 *
 * The column's direction therefore follows the sort direction, which the ↓/↑ on
 * the active sort label already states. Descending sorts shrink downward,
 * ascending sorts grow.
 *
 * Valence moved to colour instead, where it does not fight the magnitude — see
 * `getSortMeterColorName`. That channel only became free when the difficulty dot
 * was removed; while it was there, a coloured meter would have been the second
 * traffic light in one row that `SortMeter` warns about.
 */

import { FSRS_DIFFICULTY_MAX, FSRS_DIFFICULTY_MIN, OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import type { DictionarySortField } from '@/hooks/vocabulary/useDictionaryList';
import type { SolidColorName } from '@/constants/colors';
import type { StudyWord } from '@/types/vocabulary.types';
import { STRINGS } from '@/constants/strings';
import { MILLISECONDS_PER_DAY, parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import {
  MEMORY_STAGE_COLORS,
  formatHorizon,
  getHorizonFraction,
  getMemoryHorizonDays,
  getMemoryStage,
} from '@/utils/memoryHorizon';
import { DIFFICULTY_COLORS, getWordDifficultyLevel } from '@/utils/urgencyScore';
import { hasBeenPractised } from '@/utils/wordClassification';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * How hard the word is, as a length. Hardest reads longest.
 *
 * Gated on `hasBeenPractised` for the same reason the horizon meter is: a
 * never-practised word carries a placeholder difficulty of 6.5, not null, so
 * without the gate every brand-new word would show a confident mid-length bar
 * describing a judgement the learner has never been asked to make.
 */
function getDifficultyFraction(word: StudyWord): number {
  if (!hasBeenPractised(word)) return 0;
  const difficulty = word.fsrs_difficulty;
  if (difficulty == null || !Number.isFinite(difficulty)) return 0;
  const span = FSRS_DIFFICULTY_MAX - FSRS_DIFFICULTY_MIN;
  return clamp01((difficulty - FSRS_DIFFICULTY_MIN) / span);
}

/**
 * How recently the word was added, log-scaled over a year. Newest reads
 * longest, because the sort is called "Recent" and that is the quantity it
 * names — a bar that grew with age would be measuring the opposite of its label.
 *
 * Log-scaled against the same one-year window as the horizon, so the two share a
 * scale shape and the first weeks — where a learner's library actually changes —
 * get most of the travel.
 */
function getRecencyFraction(word: StudyWord, nowMs: number): number {
  const ageDays = getAgeDays(word, nowMs);
  if (ageDays === null) return 0;
  if (ageDays <= 0) return 1;
  return clamp01(1 - Math.log1p(ageDays) / Math.log1p(OPTIMIZED_FSRS_CONFIG.maximum_interval));
}

/**
 * Days since the word was saved, or `null` when `created_at` is unusable.
 *
 * One definition because the bar's LENGTH and the bar's SPOKEN value are the
 * same magnitude: derived twice, a change to either one's null policy or
 * rounding drifts them apart precisely where nothing is looking.
 */
function getAgeDays(word: StudyWord, nowMs: number): number | null {
  const created = parseSupabaseTimestamp(word.created_at);
  if (created === null) return null;
  const ageDays = (nowMs - created.getTime()) / MILLISECONDS_PER_DAY;
  return Number.isFinite(ageDays) ? ageDays : null;
}

/**
 * Spoken form of the age the `recent` meter draws — `null` when there is no
 * usable `created_at`, so the caller drops the clause rather than announcing
 * "added  ago".
 *
 * Formatted with `formatHorizon` deliberately: its phrasing is unit-generic
 * ("3 weeks", "over a year"), so an age and a memory horizon are spoken in the
 * same words and a listener is never asked to learn two vocabularies for the
 * same magnitudes.
 */
export function getRecencyAccessibilityLabel(word: StudyWord, nowMs: number): string | null {
  const ageDays = getAgeDays(word, nowMs);
  if (ageDays === null) return null;

  // `formatHorizon` floors at "1 day", which would call a word saved an hour
  // ago a day old. Under this sort those are exactly the rows at the top.
  if (ageDays < 1) return STRINGS.WORD_ADDED_TODAY_A11Y;

  return STRINGS.WORD_ADDED_AGO_A11Y.replace('{age}', formatHorizon(ageDays));
}

/**
 * 0–1 for the row meter under the active sort.
 *
 * `nowMs` is passed in rather than read from the clock here so a whole list
 * renders against one instant — otherwise two rows measured either side of a
 * millisecond boundary could disagree, and the value would be untestable.
 */
export function getSortMeterFraction(
  word: StudyWord,
  sortField: DictionarySortField,
  nowMs: number,
): number {
  // No `default`: every DictionarySortField is answered above, and dropping the
  // catch-all is what makes a FOURTH sort field a compile error here rather
  // than a meter that silently reads zero — an empty bar on every row, which
  // looks like data, not like a missing case.
  switch (sortField) {
    case 'difficulty':
      return getDifficultyFraction(word);
    case 'strength':
      return getHorizonFraction(getMemoryHorizonDays(word));
    case 'recent':
      return getRecencyFraction(word, nowMs);
  }
}

/**
 * What the bar's colour says about where this word stands on the sorted
 * variable — the judgement, now that length carries the raw magnitude.
 *
 * Colour is only spent where the app already has a real scale for the variable,
 * because inventing one is how a list starts shouting. Both scales below are
 * existing app vocabulary, so the dictionary and the word detail screen cannot
 * drift apart:
 *
 * - **difficulty** reuses `DIFFICULTY_COLORS`, the same green/amber/red the word
 *   detail screen's Difficulty stat is painted with. Long and red is a hard
 *   word: magnitude and judgement agree instead of cancelling out.
 * - **strength** follows `MemoryStage`, the app's canonical staging, and
 *   deliberately contains **no red**. A one-day memory is a stage every word
 *   passes through, not a fault, and colouring it like an error would paint an
 *   active learner's whole list as failure. Red is reserved for the leech rule
 *   that already has its own surface.
 * - **recent** stays neutral data ink. How lately you added a word carries no
 *   good or bad reading at all, and tinting it would assert one.
 */
export function getSortMeterColorName(
  word: StudyWord,
  sortField: DictionarySortField,
): SolidColorName {
  // Exhaustive, no `default` — see getSortMeterFraction above.
  switch (sortField) {
    case 'difficulty':
      return DIFFICULTY_COLORS[getWordDifficultyLevel(word)];
    case 'strength':
      return MEMORY_STAGE_COLORS[getMemoryStage(word)];
    case 'recent':
      return 'chartAccent';
  }
}
