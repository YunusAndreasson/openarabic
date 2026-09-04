/**
 * Always-on breakdown of the gap between the learner tapping "Speak to answer"
 * and the microphone actually delivering audio.
 *
 * Measured on device: that gap is 1160-1358 ms on every card, and only 125-184
 * of it is the recorder (`first_buffer_ms`, which starts at `beginWindow`). The
 * other ~1.1 s happens before the recording window is even opened, and nothing
 * recorded where it went — `first_buffer_ms` starts too late to see it and the
 * diagnostics timeline that could is gated behind __DEV__ / the debug HUD, so a
 * TestFlight session produced nothing.
 *
 * The chain being timed, in order:
 *
 *   speakNow()  ──tapToArm──▶  arm()  ──awaitOpen──▶  beginWindow()
 *                                     ──armToWindow──▶
 *
 * `tapToArm` is the React round trip: `setAttempt` → re-render → the arm effect
 * → `voice.arm()`. `awaitOpen` is `arm()` finding the input stream closed and
 * waiting on `openCapture()`, which is the leading suspect precisely because
 * the session is supposed to hold that stream open for its whole life.
 *
 * Same shape as `promptTelemetry`: a module-level singleton (one arm in flight
 * at a time), not gated on the diagnostics flag, read into the telemetry row's
 * `meta` when the attempt resolves.
 */

/** Where the tap-to-microphone time went, flattened for a jsonb column. */
export interface ArmStages {
  /** Tap → `arm()` entered: React state update, re-render, effect, preamble. */
  tapToArmMs: number | null;
  /** Was the input stream already open when `arm()` looked? The session is
   *  meant to hold it open, so `false` is itself the finding. */
  streamWasOpen: boolean | null;
  /** ms spent inside `await openCapture()`. 0 when the stream was already up. */
  awaitOpenMs: number | null;
  /** `arm()` entered → `beginWindow()` called. Includes `awaitOpenMs`. */
  armToWindowMs: number | null;
  /**
   * End-to-end duration of the restore that hands the microphone back after a
   * prompt (`setPlaybackPriority(false)`), or null if none has completed.
   *
   * The restore is kicked off the moment the Arabic finishes, so on most cards
   * it is over before the learner taps and costs nothing. This is the number
   * that decides whether that is true: it is the budget an eager tap has to
   * beat, and until now it was never measured — `awaitOpenMs` only ever saw
   * whatever tail happened to be left.
   */
  restoreMs: number | null;
  /** Was that restore still running when the learner tapped? */
  restorePendingAtTap: boolean | null;
  /** ms the tap spent waiting on an already-in-flight restore to finish. */
  restoreWaitMs: number | null;
  /** Session reset and Expo grant/ownership handoff before input opening. */
  restoreModeMs: number | null;
  /** Remaining restore work: input configuration/open and any recovery. */
  restoreInputMs: number | null;
}

const EMPTY: ArmStages = {
  tapToArmMs: null,
  streamWasOpen: null,
  awaitOpenMs: null,
  armToWindowMs: null,
  restoreMs: null,
  restorePendingAtTap: null,
  restoreWaitMs: null,
  restoreModeMs: null,
  restoreInputMs: null,
};

let tapAt: number | null = null;
let armAt: number | null = null;
let stages: ArmStages = { ...EMPTY };
/** Set while a restore is in flight; null between them. */
let restoreStartedAt: number | null = null;
/** Duration of the last restore that completed, kept across the tap reset. */
let lastRestoreMs: number | null = null;
let restoreModeReadyAt: number | null = null;
let lastRestoreModeMs: number | null = null;
let lastRestoreInputMs: number | null = null;

/** The microphone is being handed back after a prompt. */
export function markRestoreStart(): void {
  restoreStartedAt = Date.now();
  restoreModeReadyAt = null;
  lastRestoreModeMs = null;
  lastRestoreInputMs = null;
  stages = { ...stages, restoreModeMs: null, restoreInputMs: null };
}

/** Separate session reset/ownership work from input configuration and opening. */
export function markRestoreModeReady(): void {
  if (restoreStartedAt === null) return;
  restoreModeReadyAt = Date.now();
  lastRestoreModeMs = restoreModeReadyAt - restoreStartedAt;
  stages = { ...stages, restoreModeMs: lastRestoreModeMs };
}

/** The hand-back finished — this is the budget an eager tap has to beat. */
export function markRestoreEnd(): void {
  if (restoreStartedAt === null) return;
  const now = Date.now();
  lastRestoreMs = now - restoreStartedAt;
  lastRestoreInputMs = restoreModeReadyAt === null ? null : now - restoreModeReadyAt;
  restoreStartedAt = null;
  restoreModeReadyAt = null;
  stages = { ...stages, restoreMs: lastRestoreMs, restoreInputMs: lastRestoreInputMs };
}

/** How long the tap waited on a restore that was still running when it landed. */
export function markRestoreWait(ms: number): void {
  stages = { ...stages, restoreWaitMs: ms };
}

/** The learner asked for the microphone. Resets the breakdown, except what the
 *  restore already established — that happened before the tap and is the whole
 *  point of the comparison. */
export function markArmTap(): void {
  tapAt = Date.now();
  armAt = null;
  stages = {
    ...EMPTY,
    restoreMs: lastRestoreMs,
    restorePendingAtTap: restoreStartedAt !== null,
    restoreModeMs: lastRestoreModeMs,
    restoreInputMs: lastRestoreInputMs,
  };
}

/** `arm()` has been entered — closes the React round trip. */
export function markArmEntered(): void {
  armAt = Date.now();
  stages = { ...stages, tapToArmMs: tapAt === null ? null : armAt - tapAt };
}

/** What `arm()` found when it checked the input stream. */
export function markStreamState(wasOpen: boolean): void {
  stages = { ...stages, streamWasOpen: wasOpen, ...(wasOpen ? { awaitOpenMs: 0 } : {}) };
}

/** How long `arm()` waited for the stream to come back up. */
export function markAwaitOpen(ms: number): void {
  stages = { ...stages, awaitOpenMs: ms };
}

/** The recording window is opening — from here `first_buffer_ms` takes over. */
export function markBeginWindow(): void {
  stages = { ...stages, armToWindowMs: armAt === null ? null : Date.now() - armAt };
}

/** The breakdown for the arm that just resolved, for a telemetry row's `meta`. */
export function getArmStages(): ArmStages {
  return stages;
}

/** Session teardown, so one session's arm can't be reported by the next. */
export function resetArmTelemetry(): void {
  tapAt = null;
  armAt = null;
  restoreStartedAt = null;
  lastRestoreMs = null;
  restoreModeReadyAt = null;
  lastRestoreModeMs = null;
  lastRestoreInputMs = null;
  stages = { ...EMPTY };
}
