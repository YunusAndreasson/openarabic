/**
 * Always-on breakdown of the gap between the learner tapping "Tap to answer"
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
}

const EMPTY: ArmStages = {
  tapToArmMs: null,
  streamWasOpen: null,
  awaitOpenMs: null,
  armToWindowMs: null,
};

let tapAt: number | null = null;
let armAt: number | null = null;
let stages: ArmStages = { ...EMPTY };

/** The learner asked for the microphone. Resets the breakdown. */
export function markArmTap(): void {
  tapAt = Date.now();
  armAt = null;
  stages = { ...EMPTY };
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
  stages = { ...EMPTY };
}
