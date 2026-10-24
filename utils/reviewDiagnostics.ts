/**
 * Session-scoped timeline for the Practice review pipeline.
 *
 * A review card is a chain of async hand-offs — cache lookup → player load →
 * prompt playback → prompt-finish detection → mic arm → capture → transcribe →
 * grade — and every symptom reported from the field ("I randomly have to wait
 * for the mic", "the audio was quiet for a couple of answers", "is this hitting
 * the network?") is really a question about *where in that chain the time
 * went*. Guessing at it from the outside has cost several rounds of speculative
 * fixes, so each hand-off now records a timestamp and the answer is a log line.
 *
 * Disabled unless `setDiagnosticsEnabled(true)` is called (the review screen
 * turns it on in __DEV__ or when the Advanced "Voice debug HUD" setting is on,
 * so a TestFlight build can produce the same timeline). When off, `mark()` is a
 * single boolean check.
 */
import { createExternalStore } from '@/utils/createExternalStore';

/** One recorded step in the pipeline. */
export interface ReviewDiagEntry {
  /** ms since the session started. */
  at: number;
  /** ms since the previous entry — the gap that actually shows the stall. */
  delta: number;
  /** Dotted event name, e.g. `mic.arm.started`. */
  event: string;
  /** Card this happened on, when one was current. */
  card: string | null;
  data?: Record<string, unknown>;
}

/** Rolled-up numbers for the on-screen HUD and the end-of-session report. */
export interface ReviewDiagCounters {
  /** audioCache served a file already on disk. */
  cacheHits: number;
  /** audioCache had to go to the network — should be 0 in a healthy session. */
  networkDownloads: number;
  /** Total ms spent inside those downloads. */
  networkMs: number;
  /** Downloads that failed outright. */
  networkFailures: number;
  /** Cards whose mic armed successfully. */
  micArms: number;
  /** arm() calls that resolved with a failure reason. */
  micArmFailures: number;
  /** Slowest observed prompt-audio-done → recorder-capturing latency. */
  worstPromptToMicMs: number;
  /** Most recent prompt-audio-done → recorder-capturing latency. */
  lastPromptToMicMs: number;
}

const EMPTY_COUNTERS: ReviewDiagCounters = {
  cacheHits: 0,
  networkDownloads: 0,
  networkMs: 0,
  networkFailures: 0,
  micArms: 0,
  micArmFailures: 0,
  worstPromptToMicMs: 0,
  lastPromptToMicMs: 0,
};

/** Keep the timeline bounded — a long session would otherwise grow forever. */
const MAX_ENTRIES = 600;

let enabled = __DEV__;
let sessionStartedAt: number | null = null;
let lastEntryAt = 0;
let currentCard: string | null = null;
let entries: ReviewDiagEntry[] = [];
let counters: ReviewDiagCounters = { ...EMPTY_COUNTERS };
/**
 * Immutable view handed to the on-screen HUD.
 *
 * It must be a fresh object per change and reach the UI through
 * `useSyncExternalStore`, not through getter calls made during render. The
 * React Compiler treats `getDiagCounters()`-style module reads as pure and
 * caches them for the component's lifetime — even inside a `useMemo` with an
 * explicit version dependency — which froze the HUD on its first (empty)
 * values. A hook's return value is not something it can hoist.
 */
export interface ReviewDiagSnapshot {
  version: number;
  counters: ReviewDiagCounters;
  /** Most recent entries, newest last — enough for a live HUD tail. */
  tail: ReviewDiagEntry[];
}

/** How many trailing entries the snapshot carries for the HUD. */
const SNAPSHOT_TAIL = 4;

let version = 0;
/** Whether anything subscribes — snapshot work is skipped while nothing does. */
let watched = false;

function currentSnapshot(): ReviewDiagSnapshot {
  return { version, counters: { ...counters }, tail: entries.slice(-SNAPSHOT_TAIL) };
}

const snapshotStore = createExternalStore<ReviewDiagSnapshot>(
  { version: 0, counters: { ...EMPTY_COUNTERS }, tail: [] },
  {
    // First subscriber: publish what has already accumulated, since notify()
    // skips snapshot work while nobody is watching.
    onFirstSubscribe: () => {
      watched = true;
      snapshotStore.set(currentSnapshot());
    },
    onLastUnsubscribe: () => {
      watched = false;
    },
  },
);

function notify(): void {
  version += 1;
  if (!watched) return;
  snapshotStore.set(currentSnapshot());
}

/** Turn the timeline on/off. Off is the default outside dev. */
export function setDiagnosticsEnabled(next: boolean): void {
  enabled = next;
}

/** True only while a review session is open — gates the shared-service marks
 *  (audioCache, audioPlayer) so article/playlist traffic isn't recorded. */
export function isSessionActive(): boolean {
  return enabled && sessionStartedAt !== null;
}

/** Begin a timeline. Clears anything from a previous session. */
export function startDiagSession(data?: Record<string, unknown>): void {
  if (!enabled) return;
  sessionStartedAt = Date.now();
  lastEntryAt = sessionStartedAt;
  currentCard = null;
  entries = [];
  counters = { ...EMPTY_COUNTERS };
  mark('session.start', data);
}

/** Close the timeline and print the summary report. */
export function endDiagSession(): void {
  if (!enabled || sessionStartedAt === null) return;
  mark('session.end', { ...counters });

  console.log(formatDiagReport());
  sessionStartedAt = null;
  currentCard = null;
  notify();
}

/** Tag subsequent marks with the card they belong to. */
export function setDiagCard(card: string | null): void {
  currentCard = card;
}

/** Record one step. Cheap no-op when diagnostics are off. */
export function mark(event: string, data?: Record<string, unknown>): void {
  if (!enabled || sessionStartedAt === null) return;
  const now = Date.now();
  const entry: ReviewDiagEntry = {
    at: now - sessionStartedAt,
    delta: now - lastEntryAt,
    event,
    card: currentCard,
    ...(data ? { data } : {}),
  };
  lastEntryAt = now;
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  console.log(
    `[review-diag] +${entry.at}ms (Δ${entry.delta}) ${event}${
      data ? ` ${safeStringify(data)}` : ''
    }`,
  );
  notify();
}

/**
 * Start timing a span. Returns the closer, which marks `<event>` with the
 * measured `ms`. Safe to call (and to close) when diagnostics are off.
 */
export function span(
  event: string,
  data?: Record<string, unknown>,
): (endData?: Record<string, unknown>) => number {
  const startedAt = Date.now();
  return (endData?: Record<string, unknown>): number => {
    const ms = Date.now() - startedAt;
    mark(event, { ...data, ...endData, ms });
    return ms;
  };
}

/** Bump a counter without emitting a timeline entry. */
export function countDiag(update: Partial<ReviewDiagCounters>): void {
  if (!enabled || sessionStartedAt === null) return;
  for (const [key, value] of Object.entries(update)) {
    if (typeof value !== 'number') continue;
    const field = key as keyof ReviewDiagCounters;
    counters[field] += value;
  }
  notify();
}

/** Record a prompt-done → mic-capturing latency (the headline number). */
export function recordPromptToMic(ms: number): void {
  if (!enabled || sessionStartedAt === null) return;
  counters.lastPromptToMicMs = ms;
  if (ms > counters.worstPromptToMicMs) counters.worstPromptToMicMs = ms;
  notify();
}

/** useSyncExternalStore snapshot getter — stable between notifications. */
export function getDiagSnapshot(): ReviewDiagSnapshot {
  return snapshotStore.get();
}

/** Subscribe to timeline changes (the HUD re-renders off this). */
export function subscribeDiag(listener: () => void): () => void {
  return snapshotStore.subscribe(() => {
    try {
      listener();
    } catch {
      // A broken HUD subscriber must never break the pipeline it is watching
    }
  });
}

function safeStringify(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '[unserializable]';
  }
}

/**
 * Human-readable end-of-session report: the counters, then every gap longer
 * than 250 ms (those gaps ARE the felt latency).
 */
function formatDiagReport(): string {
  const slow = entries.filter(entry => entry.delta >= 250);
  const lines = [
    '[review-diag] ── session report ──',
    `[review-diag] network downloads: ${counters.networkDownloads} (${counters.networkMs}ms, ${counters.networkFailures} failed) · cache hits: ${counters.cacheHits}`,
    `[review-diag] mic arms: ${counters.micArms} ok / ${counters.micArmFailures} failed · prompt→mic last ${counters.lastPromptToMicMs}ms worst ${counters.worstPromptToMicMs}ms`,
    `[review-diag] slow steps (≥250ms gap): ${slow.length}`,
  ];
  slow.forEach(entry => {
    lines.push(`[review-diag]   Δ${entry.delta}ms → ${entry.event} @${entry.at}ms [${entry.card}]`);
  });
  return lines.join('\n');
}
