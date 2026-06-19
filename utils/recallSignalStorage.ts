import type { RecentRecall } from '@/utils/newWordPacing';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

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

const RECENT_RECALL_KEY = 'recent_recall_sessions';
/** Rolling window: the most recent N sessions feed the recall estimate. */
const MAX_SESSIONS = 10;

interface RecallSessionEntry {
  known: number;
  unknown: number;
  at: number;
}

async function readSessions(): Promise<RecallSessionEntry[]> {
  const storage = getSafeStorage();
  try {
    const raw = await storage.getItem(RECENT_RECALL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecallSessionEntry =>
        entry != null &&
        typeof entry === 'object' &&
        typeof (entry as RecallSessionEntry).known === 'number' &&
        typeof (entry as RecallSessionEntry).unknown === 'number' &&
        typeof (entry as RecallSessionEntry).at === 'number',
    );
  } catch {
    return [];
  }
}

/** Record a finished session's first-attempt tally into the rolling window. */
export async function appendSession(known: number, unknown: number): Promise<void> {
  // Nothing graded → nothing to learn from; don't dilute the window.
  if (known + unknown <= 0) return;

  const storage = getSafeStorage();
  try {
    const sessions = await readSessions();
    sessions.push({ known, unknown, at: Date.now() });
    await storage.setItem(RECENT_RECALL_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch {
    // Best-effort; pacing falls back to "warming-up" if this fails.
  }
}

/** Sum the recent window into a single recall rate + sample size. */
export async function readRecentRecall(): Promise<RecentRecall> {
  const sessions = await readSessions();

  let known = 0;
  let unknown = 0;
  for (const session of sessions) {
    known += session.known;
    unknown += session.unknown;
  }

  const trials = known + unknown;
  return { recall: trials > 0 ? known / trials : 0, trials };
}
