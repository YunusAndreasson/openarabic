/**
 * How far a single word's memory currently reaches, and how far along it is.
 *
 * FSRS `stability` is not an abstract score: it is the number of days until
 * predicted recall of that word falls to `request_retention` (0.90). So "holds
 * for 23 days" is the definition, not a metaphor — and unlike a Weak/Medium/
 * Strong bucket it keeps growing with every successful review, all the way to
 * `maximum_interval`. That is what makes it a development metric rather than a
 * label.
 *
 * Single source of truth for the dictionary row's meter and the word detail
 * screen's Memory panel, so the length of a bar and the words beside it can
 * never disagree.
 */

import { State } from 'ts-fsrs';

import { OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { hasBeenPractised, isMasteredWord } from '@/utils/wordClassification';

/**
 * Where a word sits in its life, in the app's own existing vocabulary.
 *
 * Four rungs, not five, and `mastered` is deliberately NOT a new threshold:
 * it delegates to `isMasteredWord` (state 2 + stability >= 5), the single
 * predicate every "mastered" surface shares. Inventing a second bar for
 * "mastered" is exactly how the old `Strength: Strong` (stability >= 7) drifted
 * away from it.
 */
export type MemoryStage = 'new' | 'learning' | 'familiar' | 'mastered';

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

export function getMemoryStage(word: StudyWord): MemoryStage {
  const state = word.fsrs_state ?? State.New;
  if (state === State.New) return 'new';
  // Learning (1) and Relearning (3) are the same thing to a learner: the word is
  // in short steps and hasn't graduated. Splitting them would surface an
  // implementation detail of the scheduler.
  if (state !== State.Review) return 'learning';
  return isMasteredWord(word) ? 'mastered' : 'familiar';
}

export const MEMORY_STAGE_LABELS: Record<MemoryStage, string> = {
  new: STRINGS.WORD_STATE_NEW,
  learning: STRINGS.WORD_STAGE_LEARNING,
  familiar: STRINGS.WORD_STAGE_FAMILIAR,
  mastered: STRINGS.WORD_STAGE_MASTERED,
};

/**
 * Theme colour per stage, for surfaces that paint a memory rather than name it.
 *
 * A deliberately calm ramp with **no red in it**: untouched grey, then the chart
 * accent for the two stages where a memory is genuinely developing, then success
 * green once the word clears the app's own mastery rule. Every word passes
 * through `learning`, so tinting that stage like a warning would paint an active
 * learner's entire list as failure — which is the opposite of what the horizon
 * is for. The one red signal in this domain is the leech rule, and it already
 * has its own surface in "Words to revisit".
 */
export const MEMORY_STAGE_COLORS = {
  new: 'textTertiary',
  learning: 'chartAccent',
  familiar: 'chartAccent',
  mastered: 'success',
} as const satisfies Record<MemoryStage, string>;

/**
 * Days this word currently holds, or `null` when there is no memory to measure
 * yet. `null` is not zero: a never-practised word has no horizon, which is a
 * different statement from "you would forget it immediately".
 */
export function getMemoryHorizonDays(word: StudyWord): number | null {
  if (!hasBeenPractised(word)) return null;
  const stability = word.fsrs_stability;
  if (stability == null || !Number.isFinite(stability) || stability <= 0) return null;
  return stability;
}

/**
 * 0..1 for a meter, log-scaled against `maximum_interval`.
 *
 * Linear would be useless: stability spans 0–365 days, so on a linear scale
 * every word a learner is actually working on sits in the leftmost few percent
 * and the whole column reads as empty. Log spreads the early days — where
 * progress is fastest and most motivating — and still keeps climbing at the top
 * end, so a 200-day word visibly beats a 30-day one.
 */
export function getHorizonFraction(days: number | null): number {
  if (days == null || !Number.isFinite(days) || days <= 0) return 0;
  const fraction = Math.log1p(days) / Math.log1p(OPTIMIZED_FSRS_CONFIG.maximum_interval);
  return Math.min(1, Math.max(0, fraction));
}

/**
 * A horizon a learner can picture: "5 days", "3 weeks", "4 months".
 *
 * Rounds to the unit that keeps the number small — nobody reads "127 days".
 */
export function formatHorizon(days: number | null): string {
  if (days == null || !Number.isFinite(days) || days <= 0) return '';

  if (days >= DAYS_PER_YEAR) return STRINGS.WORD_HORIZON_YEAR;

  if (days >= DAYS_PER_MONTH) {
    const months = Math.round(days / DAYS_PER_MONTH);
    return months === 1
      ? STRINGS.WORD_HORIZON_MONTH_ONE
      : STRINGS.WORD_HORIZON_MONTHS.replace('{count}', String(months));
  }

  if (days >= DAYS_PER_WEEK) {
    const weeks = Math.round(days / DAYS_PER_WEEK);
    return weeks === 1
      ? STRINGS.WORD_HORIZON_WEEK_ONE
      : STRINGS.WORD_HORIZON_WEEKS.replace('{count}', String(weeks));
  }

  // Below a day still reads as "1 day" rather than "0 days" — the word holds for
  // *some* of today, and a zero here would look like a bug rather than a fact.
  const wholeDays = Math.max(1, Math.round(days));
  return wholeDays === 1
    ? STRINGS.WORD_HORIZON_DAY_ONE
    : STRINGS.WORD_HORIZON_DAYS.replace('{count}', String(wholeDays));
}

/**
 * The meter is length-only, so every surface that draws one must also say it out
 * loud. Kept here so the phrasing can't drift between the row and the panel.
 */
export function getHorizonAccessibilityLabel(days: number | null): string {
  if (days == null) return STRINGS.WORD_HORIZON_A11Y_NONE;
  return STRINGS.WORD_HORIZON_A11Y.replace('{horizon}', formatHorizon(days));
}

// ---------------------------------------------------------------------------
// Horizon bands — the axis the practice screen's constellation is binned along.
// ---------------------------------------------------------------------------

/**
 * Four bands, ordered shortest to longest so reading direction is growth
 * direction.
 *
 * The boundaries are `formatHorizon`'s OWN unit boundaries, taken from the same
 * three constants it branches on. That coupling is the point: any other cut
 * produces a screen where a word's detail page says "holds for 6 days" while the
 * chart files it under "Weeks".
 *
 * Deliberately NOT aligned to the mastery rule (state 2 + stability >= 5). Five
 * days is not a natural unit, so the labels would be meaningless, and the
 * alignment would still only be approximate — a Relearning word with stability 8
 * clears five days but fails `isMasteredWord`, which also requires state 2.
 * Bands describe how long a word holds; stages describe where it is in its life.
 * Different questions, and they are never shown as peers.
 */
export const HORIZON_BAND_KEYS = ['days', 'weeks', 'months', 'year'] as const;

export type HorizonBandKey = (typeof HORIZON_BAND_KEYS)[number];

export const HORIZON_BAND_LABELS: Record<HorizonBandKey, string> = {
  days: STRINGS.HORIZON_BAND_DAYS,
  weeks: STRINGS.HORIZON_BAND_WEEKS,
  months: STRINGS.HORIZON_BAND_MONTHS,
  year: STRINGS.HORIZON_BAND_YEAR,
};

/**
 * The same four boundaries in plain language.
 *
 * On the practice card the labels sit on a drawn time axis, which says what
 * "Weeks" means. In a list of rows there is no axis, so each band has to carry
 * its own span — and it must be read off the SAME constants `getHorizonBand`
 * branches on, or a row will name a range it does not filter by.
 */
export const HORIZON_BAND_HINTS: Record<HorizonBandKey, string> = {
  days: STRINGS.HORIZON_BAND_HINT_DAYS,
  weeks: STRINGS.HORIZON_BAND_HINT_WEEKS,
  months: STRINGS.HORIZON_BAND_HINT_MONTHS,
  year: STRINGS.HORIZON_BAND_HINT_YEAR,
};

export interface HorizonBand {
  key: HorizonBandKey;
  label: string;
  count: number;
}

/**
 * Which band a WORD falls in, or `null` when it has no horizon yet.
 *
 * The two-step — horizon first, band second — is the practised gate, and going
 * through it is what keeps a never-reviewed word (which carries PLACEHOLDER
 * stability, not null) out of the `days` band. Every surface that groups words
 * by band must come through here rather than re-deriving it.
 */
export function getWordHorizonBand(word: StudyWord): HorizonBandKey | null {
  return getHorizonBand(getMemoryHorizonDays(word));
}

/** Which band a horizon falls in. `null` for a word with no horizon at all. */
export function getHorizonBand(days: number | null): HorizonBandKey | null {
  if (days == null || !Number.isFinite(days) || days <= 0) return null;
  if (days >= DAYS_PER_YEAR) return 'year';
  if (days >= DAYS_PER_MONTH) return 'months';
  if (days >= DAYS_PER_WEEK) return 'weeks';
  return 'days';
}

/**
 * The constellation is shape-and-position only, so it says itself out loud the
 * same way the row meter does. Phrasing lives here so the drawing and any future
 * sheet cannot drift.
 */
export function getHorizonBandsAccessibilityLabel(bands: readonly HorizonBand[]): string {
  return bands
    .filter(band => band.count > 0)
    .map(band =>
      STRINGS.HORIZON_BAND_COUNT_A11Y.replace('{count}', String(band.count)).replace(
        '{band}',
        band.label.toLowerCase(),
      ),
    )
    .join(', ');
}
