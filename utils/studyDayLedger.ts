import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createJsonStore } from '@/utils/createJsonStore';
import { toLocalDateString } from '@/utils/dateTimeUtils';

/**
 * Append-only local record of the LOCAL calendar days on which the learner
 * actually reviewed something.
 *
 * It exists because the server cannot answer the question. `study_words` holds
 * only current FSRS state, and `fsrs_last_review` is a single column that every
 * review OVERWRITES — so the day-key set derived from it
 * (`StudySessionStreakService.fetchStudyDayKeys`) is not a history, it is a
 * snapshot of "when was each word last touched". Three things follow, and all
 * three were visible on real accounts:
 *
 *   1. `totalReadingDays` is capped by vocabulary size. The derived set holds at
 *      most one key per reviewed word, so a learner with 15 words could never
 *      show more than 15 total study days.
 *   2. `longestStreak` can FALL between two app opens. A day key vanishes the
 *      moment the last word still pointing at it is re-reviewed.
 *   3. Worst for the people it is meant to encourage: someone still in the
 *      1m/10m learning steps who re-reviews the same small set every day
 *      collapses every key onto today, and reads a permanent streak of 1.
 *
 * A streak that erodes on its own is worse than no streak. This ledger only ever
 * grows, so unioned with the derived set it turns those three numbers monotone.
 *
 * Honest limitations, stated because they are real:
 * - Per-device, and lost on reinstall (same trade-off as `recallSignalStorage`
 *   and the daily word count).
 * - The one-time seed inherits whatever under-count the derived set has today.
 *   That is a floor that stops eroding, not a reconstruction of lost history.
 * - A genuine fix — reviews-per-day, true retention, an honest heatmap — needs a
 *   `review_logs` table, which is a schema change and out of scope here.
 */

/** `YYYY-MM-DD`, the same shape `toLocalDateString` emits. */
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && DAY_KEY_PATTERN.test(value);
}

// Best-effort and silent. A failed read is an empty set — the caller unions
// this with the server-derived set, so a failure degrades to today's
// behaviour rather than blanking the streak — and a missed write costs one
// day of ledger history, which the server-derived set still covers.
const ledgerStore = createJsonStore<Set<string>>({
  key: STORAGE_KEYS.STUDY_DAYS,
  decode: raw => (Array.isArray(raw) ? new Set(raw.filter(isDayKey)) : null),
  empty: () => new Set(),
  onReadError: () => new Set(),
  // Stored as a sorted array, as it always has been.
  encode: days => [...days].sort(),
  report: false,
});

/** Every study day this device has recorded; an empty set on any read or parse failure. */
export function readStudyDays(): Promise<Set<string>> {
  return ledgerStore.read();
}

/** Add `date`'s local day to the ledger. Idempotent within a day. */
export async function recordStudyDay(date: Date = new Date()): Promise<void> {
  const key = toLocalDateString(date);

  const days = await readStudyDays();
  if (days.has(key)) return;

  days.add(key);
  await ledgerStore.write(days);
}

/**
 * Union `derived` into the ledger and return the merged set.
 *
 * Called on every streak read, not just the first: it both seeds an existing
 * learner's history the first time they open the app after this shipped, and
 * captures each subsequent day before the server-side key for it is overwritten
 * by a later review. Writes only when there is something new to add, so a
 * steady-state read is a single `getItem`.
 */
export async function mergeStudyDays(derived: Set<string>): Promise<Set<string>> {
  const stored = await readStudyDays();
  const merged = stored.union(derived);

  // A failed write leaves the merged set correct for this read; only
  // persistence failed.
  if (merged.size > stored.size) await ledgerStore.write(merged);

  return merged;
}
