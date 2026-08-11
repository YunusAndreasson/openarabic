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
 * One polarity throughout: **a short bar is the word that needs attention.**
 * That is why difficulty is inverted here — hard words read short, matching the
 * red dot beside them and matching a weak memory. Every sort therefore fills
 * downward from its default direction, so the column has the same rhythm however
 * the list is ordered.
 */

import {
  FSRS_DIFFICULTY_MAX,
  FSRS_DIFFICULTY_MIN,
  OPTIMIZED_FSRS_CONFIG,
} from '@/constants/fsrs';
import type { DictionarySortField } from '@/hooks/vocabulary/useDictionaryList';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { getHorizonFraction, getMemoryHorizonDays } from '@/utils/memoryHorizon';
import { hasBeenPractised } from '@/utils/wordClassification';

const MS_PER_DAY = 86_400_000;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * How hard the word is, as a length, inverted so hard reads short.
 *
 * Gated on `hasBeenPractised` for the same reason the dot and the horizon meter
 * are: a never-practised word carries a placeholder difficulty of 6.5, not null,
 * so without the gate every brand-new word would show a confident mid-length bar
 * describing a judgement the learner has never been asked to make.
 */
function getDifficultyFraction(word: StudyWord): number {
  if (!hasBeenPractised(word)) return 0;
  const difficulty = word.fsrs_difficulty;
  if (difficulty == null || !Number.isFinite(difficulty)) return 0;
  const span = FSRS_DIFFICULTY_MAX - FSRS_DIFFICULTY_MIN;
  return clamp01((FSRS_DIFFICULTY_MAX - difficulty) / span);
}

/**
 * How long the word has been in the library, log-scaled over a year.
 *
 * Age rather than recency, so the polarity holds: the "Recent" sort defaults to
 * newest-first, and a word you added today is the one you have done least with.
 * It starts empty and grows, which is also what the horizon meter does — a new
 * word looks new under either reading.
 *
 * Log-scaled against the same one-year window as the horizon, so the two share a
 * scale shape and the first weeks — where a learner's library actually changes —
 * get most of the travel.
 */
function getAgeFraction(word: StudyWord, nowMs: number): number {
  const created = parseSupabaseTimestamp(word.created_at);
  if (created === null) return 0;
  const ageDays = (nowMs - created.getTime()) / MS_PER_DAY;
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 0;
  return clamp01(Math.log1p(ageDays) / Math.log1p(OPTIMIZED_FSRS_CONFIG.maximum_interval));
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
      return getAgeFraction(word, nowMs);
    default:
      return 0;
  }
}
