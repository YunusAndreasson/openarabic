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
import {
  simpleAudioService,
  type AudioStatus,
  type AudioSubscribeOptions,
} from '@/services/audioPlayer';
import { mark as diagMark } from '@/utils/reviewDiagnostics';

/**
 * Grace after the prompt stops before declaring it done, so the tail isn't
 * clipped.
 *
 * This was 200 ms, and most of that was spent letting the playback session
 * release before the microphone claimed a record-capable one. There is no such
 * hand-off any more: the review session holds one audio session for its whole
 * life and the recorder is only resumed, never opened (see
 * lib/voice/recording.ts). What remains is a guard on the clip's own tail, and
 * every millisecond of it is silence the learner sits through.
 */
export const PROMPT_FINISH_GRACE_MS = 60;
/** Safety cap while the clip's duration is still unknown. Once the player
 *  reports a duration the cap tightens to that plus PROMPT_OVERRUN_MS. */
export const PROMPT_MAX_WAIT_MS = 8000;
/** Slack over the reported duration before giving up on the finish event.
 *  Covers the 500 ms status interval plus a little scheduling jitter. */
const PROMPT_OVERRUN_MS = 1500;
/** How often the status is re-read. `subscribe` only fires on change and never
 *  replays the current value, so the poll backs the event up and drives caps. */
const POLL_INTERVAL_MS = 100;

/** The slice of the audio service this watcher needs; injectable for tests. */
export interface PromptStatusSource {
  getStatus: () => AudioStatus;
  subscribe: (
    listener: (status: AudioStatus) => void,
    options?: AudioSubscribeOptions,
  ) => () => void;
}

/** Why the watcher settled — surfaced in diagnostics, asserted in tests. */
export type PromptFinishReason =
  'didJustFinish' | 'stopped' | 'reachedEnd' | 'maxWait' | 'cancelled' | 'superseded';

/** How the prompt ended, handed to `onFinish` so the caller can record it
 *  without re-deriving it from a status it no longer has. */
export interface PromptFinishOutcome {
  reason: PromptFinishReason;
  /** ms the watcher was open — how long the clip was actually audible. */
  audibleMs: number;
  /** Clip length the player reported, or 0 if it never reported one. */
  durationMs: number;
  /** Distinct play-head readings this watcher saw. The `reachedEnd` deadline is
   *  only as good as its last sample, so a low count on a ~1.5 s clip means the
   *  estimate was extrapolating from stale data rather than tracking playback. */
  positionSamples: number;
}

/**
 * Did the player's own end-of-source event ever show up, and if so, how late?
 *
 * Measured because a field session came back `reachedEnd` on 11 cards out of
 * 11 and `didJustFinish` on none, while the same code on Android saw it 32
 * times in 46. Two very different explanations fit that: either expo-audio
 * never emits it on iOS, or it does and simply loses the race — the wall-clock
 * backstop fires at the *estimated* end, which on an accurate estimate is a few
 * ms before the real one. The fix is opposite in each case, so this settles it
 * instead of guessing: keep listening briefly after settling and report whether
 * the authoritative event turns up.
 */
export interface PromptFinishAudit {
  /** True if `didJustFinish` / `ended` arrived after we had already settled. */
  lateEventSeen: boolean;
  /** ms between settling on an estimate and that event landing. */
  lateEventMs: number | null;
}

/** How long to keep listening for the authoritative event after settling on an
 *  estimate. Generous next to the few ms a lost race would cost, and short
 *  enough that the audit lands before the card's telemetry row is written. */
const FINISH_EVENT_AUDIT_MS = 750;

/** Estimate-based settles — the only ones where a later authoritative event is
 *  meaningful. A torn-down track (`stopped`/`cancelled`/`superseded`) has no
 *  source left to finish, so watching for one would only ever time out. */
const AUDITED_REASONS: ReadonlySet<PromptFinishReason> = new Set<PromptFinishReason>([
  'reachedEnd',
  'maxWait',
]);

/**
 * Calls `onFinish` once the prompt that `play()` just started has finished.
 * Returns a canceller; calling it settles the watcher immediately.
 */
export function watchPromptFinish(
  onFinish: (outcome: PromptFinishOutcome) => void,
  isCancelled: () => boolean,
  source: PromptStatusSource = simpleAudioService,
  onAudit?: (audit: PromptFinishAudit) => void,
): () => void {
  let settled = false;
  const startedAt = Date.now();
  /** Distinct play-head readings seen — reported so a starved estimate is
   *  visible rather than inferred from the overshoot alone. */
  let positionSamples = 0;
  /** Teardown for the post-settle audit, so the canceller can reach it too. */
  let cancelAudit: (() => void) | null = null;
  /** The pending grace-period delay before a settled `onFinish` actually
   *  fires. Tracked so the canceller can still stop it — without this, a
   *  cancel landing inside the grace window (a fast card advance, or a
   *  replay tap right on the natural end of the clip) was a no-op: `finish`
   *  had already flipped `settled` true, so the short-circuit above ran and
   *  the scheduled `onFinish` fired anyway, tens of ms after the caller
   *  believed this watcher was dead. Downstream that stale call still hands
   *  the audio session back (see markDone in useReview), landing after the
   *  NEW card's own session request and reopening the microphone under it. */
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
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

  /**
   * Keep one cheap listener alive after an estimate-based settle, purely to see
   * whether the player's own finish event turns up afterwards. Reports exactly
   * once and tears itself down either way. Nothing downstream waits on it — the
   * prompt is already done as far as the session is concerned.
   */
  const auditLateFinish = (settledAt: number): void => {
    if (!onAudit) return;
    let reported = false;
    const report = (audit: PromptFinishAudit): void => {
      if (reported) return;
      reported = true;
      clearTimeout(deadline);
      stopAudit();
      cancelAudit = null;
      onAudit(audit);
    };
    const stopAudit = source.subscribe(status => {
      if (status.didJustFinish || status.playbackState === 'ended') {
        report({ lateEventSeen: true, lateEventMs: Date.now() - settledAt });
      }
    });
    const deadline = setTimeout(
      () => report({ lateEventSeen: false, lateEventMs: null }),
      FINISH_EVENT_AUDIT_MS,
    );
    cancelAudit = () => report({ lateEventSeen: false, lateEventMs: null });
  };

  const finish = (graceMs: number, reason: PromptFinishReason): void => {
    if (settled) {
      // The canceller runs on teardown as well as supersession, and by then the
      // audit may still be open on a screen that is going away.
      cancelAudit?.();
      return;
    }
    settled = true;
    clearInterval(poll);
    unsubscribe();
    const audibleMs = Date.now() - startedAt;
    diagMark('prompt.finish', { reason, ms: audibleMs, graceMs, durationMs, positionSamples });
    // Measured at the settle, not after the grace — the grace is silence the
    // learner sits through, not part of the word.
    const outcome: PromptFinishOutcome = { reason, audibleMs, durationMs, positionSamples };
    if (AUDITED_REASONS.has(reason)) auditLateFinish(Date.now());
    if (graceMs > 0 && !isCancelled()) {
      graceTimer = setTimeout(() => {
        graceTimer = null;
        onFinish(outcome);
      }, graceMs);
    } else {
      onFinish(outcome);
    }
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
      positionSamples += 1;
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

  // Position channel: the `reachedEnd` backstop is derived from the play head,
  // so this watcher is one of the two things in the app that genuinely needs
  // the ticks. Everything else on the transport channel is spared them.
  const unsubscribe = source.subscribe(evaluate, { position: true });
  const poll = setInterval(() => evaluate(source.getStatus()), POLL_INTERVAL_MS);
  evaluate(source.getStatus());
  return () => {
    // Already settled and waiting out its grace pad — `finish` would take the
    // `if (settled)` short-circuit and leave the scheduled `onFinish` armed.
    // Clear it directly so a cancel landing in this window actually prevents
    // the callback, matching what "settles the watcher immediately" promises.
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
      cancelAudit?.();
      return;
    }
    finish(0, 'superseded');
  };
}
