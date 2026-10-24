import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createJsonStore } from '@/utils/createJsonStore';
import type { RecentRecall } from '@/utils/newWordPacing';

/**
 * Local, per-device record of recent realised recall, used to drive adaptive
 * new-word pacing without a server-side review log. Each finished session
 * appends its first-attempt known/unknown tally; the recent window is summed
 * into a single recall rate + sample size.
 *
 * Honest limitations:
 * - Per-device and lost on reinstall (acceptable, matches `daily_word_count`).
 * - First-attempt-per-word only — re-asks within a session are excluded so the
 *   spacing/drill queue can't inflate the "unknown" count.
 * - Empty until ≥1 session is recorded; pacing treats that as "warming-up"
 *   (full ceiling), the safe default.
 */

/** Rolling window: the most recent N sessions feed the recall estimate. */
const MAX_SESSIONS = 10;

interface RecallSessionEntry {
  known: number;
  unknown: number;
  at: number;
}

const isRecallSessionEntry = (entry: unknown): entry is RecallSessionEntry =>
  typeof entry === 'object' &&
  entry !== null &&
  'known' in entry &&
  typeof entry.known === 'number' &&
  'unknown' in entry &&
  typeof entry.unknown === 'number' &&
  'at' in entry &&
  typeof entry.at === 'number';

// Best-effort and silent: a failed read or write falls back to "warming-up".
const sessionsStore = createJsonStore<RecallSessionEntry[]>({
  key: STORAGE_KEYS.RECENT_RECALL_SESSIONS,
  decode: raw => (Array.isArray(raw) ? raw.filter(isRecallSessionEntry) : null),
  empty: () => [],
  onReadError: () => [],
  encode: sessions => sessions.slice(-MAX_SESSIONS),
  report: false,
});

/** Record a finished session's first-attempt tally into the rolling window. */
export async function appendSession(known: number, unknown: number): Promise<void> {
  // Nothing graded → nothing to learn from; don't dilute the window.
  if (known + unknown <= 0) return;

  const sessions = await sessionsStore.read();
  await sessionsStore.write([...sessions, { known, unknown, at: Date.now() }]);
}

/** Sum the recent window into a single recall rate + sample size. */
export async function readRecentRecall(): Promise<RecentRecall> {
  const sessions = await sessionsStore.read();

  let known = 0;
  let unknown = 0;
  for (const session of sessions) {
    known += session.known;
    unknown += session.unknown;
  }

  const trials = known + unknown;
  return { recall: trials > 0 ? known / trials : 0, trials };
}
