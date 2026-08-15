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
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import {
  MEMORY_STAGE_COLORS,
  getHorizonFraction,
  getMemoryHorizonDays,
  getMemoryStage,
} from '@/utils/memoryHorizon';
import { DIFFICULTY_COLORS, getWordDifficultyLevel } from '@/utils/urgencyScore';
import { hasBeenPractised } from '@/utils/wordClassification';

const MS_PER_DAY = 86_400_000;

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
  const created = parseSupabaseTimestamp(word.created_at);
  if (created === null) return 0;
  const ageDays = (nowMs - created.getTime()) / MS_PER_DAY;
  if (!Number.isFinite(ageDays)) return 0;
  if (ageDays <= 0) return 1;
  return clamp01(1 - Math.log1p(ageDays) / Math.log1p(OPTIMIZED_FSRS_CONFIG.maximum_interval));
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
  switch (sortField) {
    case 'difficulty':
      return getDifficultyFraction(word);
    case 'strength':
      return getHorizonFraction(getMemoryHorizonDays(word));
    case 'recent':
      return getRecencyFraction(word, nowMs);
    default:
      return 0;
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
  switch (sortField) {
    case 'difficulty':
      return DIFFICULTY_COLORS[getWordDifficultyLevel(word)];
    case 'strength':
      return MEMORY_STAGE_COLORS[getMemoryStage(word)];
    case 'recent':
    default:
      return 'chartAccent';
  }
}
