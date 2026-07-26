/**
 * Decides when a review card's Arabic prompt has finished playing.
 *
 * This is the gate the voice-grading microphone waits on, and getting it wrong
 * is expensive in both directions: fire late and the learner sits in silence;
 * fire early and the mic opens over the prompt — which on iOS pulls the audio
 * session into `playAndRecord` mid-word (the prompt audibly drops in volume)
 * and records the prompt instead of the learner. It lives in its own module,
 * with the status source injectable, because it earns direct tests.
 *
 * The previous implementation watched the falling edge of `status.playing`.
 * That is not an end-of-clip signal: simpleAudioService sets `playing: true`
 * optimistically the instant `play()` is invoked, and the native player's first
 * real status update — ~15 ms later, while it is still spinning up — reports
 * `playing: false`. Measured on device, that declared a 1416 ms word finished
 * after 16 ms, on every single card.
 *
 * What it watches instead, in priority order:
 *   1. `didJustFinish` / `playbackState: 'ended'` — the player's own
 *      end-of-source event, which is what expo-audio actually publishes.
 *   2. The track being torn down (a newer play(), or stopAudio).
 *   3. A wall-clock estimate derived from the reported duration and play head,
 *      as a backstop if the finish event never lands.
 *   4. A hard cap, so the mic can never hang.
 */
import { simpleAudioService, type AudioStatus } from '@/services/audioPlayer';
import { mark as diagMark } from '@/utils/reviewDiagnostics';

/** Grace after the prompt stops before declaring it done, so the tail isn't
 *  clipped and the playback session fully releases before the mic opens. */
export const PROMPT_FINISH_GRACE_MS = 200;
/** Safety cap while the clip's duration is still unknown. Once the player
 *  reports a duration the cap tightens to that plus PROMPT_OVERRUN_MS. */
export const PROMPT_MAX_WAIT_MS = 8000;
/** Slack over the reported duration before giving up on the finish event.
 *  Covers the 500 ms status interval plus a little scheduling jitter. */
export const PROMPT_OVERRUN_MS = 1500;
/** How often the status is re-read. `subscribe` only fires on change and never
 *  replays the current value, so the poll backs the event up and drives caps. */
const POLL_INTERVAL_MS = 100;

/** The slice of the audio service this watcher needs; injectable for tests. */
export interface PromptStatusSource {
  getStatus: () => AudioStatus;
  subscribe: (listener: (status: AudioStatus) => void) => () => void;
}

/** Why the watcher settled — surfaced in diagnostics, asserted in tests. */
export type PromptFinishReason =
  'didJustFinish' | 'stopped' | 'reachedEnd' | 'maxWait' | 'cancelled' | 'superseded';

/**
 * Calls `onFinish` once the prompt that `play()` just started has finished.
 * Returns a canceller; calling it settles the watcher immediately.
 */
export function watchPromptFinish(
  onFinish: () => void,
  isCancelled: () => boolean,
  source: PromptStatusSource = simpleAudioService,
): () => void {
  let settled = false;
  const startedAt = Date.now();
  // Wall-clock instant the clip is expected to end, derived from the player's
  // reported duration/position. Recomputed on every status so it tracks the
  // real play head rather than assuming playback began when play() resolved.
  let expectedEndAt = 0;
  let durationMs = 0;
  // Last play-head position the estimate was derived from. The poll re-reads
  // the same status object between native ticks, so without this the deadline
  // would be pushed forward on every poll and a player whose position stalls
  // (but still reports `playing`) would hold the microphone shut indefinitely.
  let lastPositionS = -1;

  const finish = (graceMs: number, reason: PromptFinishReason): void => {
    if (settled) return;
    settled = true;
    clearInterval(poll);
    unsubscribe();
    diagMark('prompt.finish', { reason, ms: Date.now() - startedAt, graceMs, durationMs });
    if (graceMs > 0 && !isCancelled()) setTimeout(onFinish, graceMs);
    else onFinish();
  };

  const evaluate = (status: AudioStatus): void => {
    if (isCancelled()) return finish(0, 'cancelled');

    // The player's own end-of-source event — authoritative.
    if (status.didJustFinish || status.playbackState === 'ended') {
      return finish(PROMPT_FINISH_GRACE_MS, 'didJustFinish');
    }

    // The track was torn down under us — there is no prompt left to wait for.
    if (status.currentTrack === null && status.playbackState === 'idle') {
      return finish(0, 'stopped');
    }

    // Re-derive the deadline only from a genuinely new play-head reading.
    if (status.duration > 0 && status.currentTime !== lastPositionS) {
      lastPositionS = status.currentTime;
      durationMs = status.duration * 1000;
      expectedEndAt = Date.now() + (status.duration - status.currentTime) * 1000;
    }

    // Backstop for a finish event that never lands. Time-based rather than a
    // position epsilon, so it can never cut the tail of the word off.
    if (expectedEndAt > 0 && Date.now() >= expectedEndAt) {
      return finish(PROMPT_FINISH_GRACE_MS, 'reachedEnd');
    }

    const cap = durationMs > 0 ? durationMs + PROMPT_OVERRUN_MS : PROMPT_MAX_WAIT_MS;
    if (Date.now() - startedAt >= cap) return finish(0, 'maxWait');
  };

  const unsubscribe = source.subscribe(evaluate);
  const poll = setInterval(() => evaluate(source.getStatus()), POLL_INTERVAL_MS);
  evaluate(source.getStatus());
  return () => finish(0, 'superseded');
}
