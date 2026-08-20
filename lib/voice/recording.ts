/**
 * Microphone capture for the Practice "speak the English answer" flow. Records
 * mono PCM via react-native-audio-api and hands back a 16 kHz Float32Array —
 * exactly what Parakeet expects. Stopping is hands-free: an energy gate watches
 * each buffer, measures the room it is in, and auto-stops once the learner has
 * spoken over that room and then gone quiet, backed up by a hard duration cap.
 * It decides in dB relative to the room and never in absolute rms — see the
 * note above `dbfs`, which is the third regression that lesson cost.
 *
 * The input stream is opened ONCE per review session and only paused between
 * cards. It used to be built and destroyed per card, and that is where the
 * feature's whole reliability history came from: opening an exclusive input
 * stream costs ~500 ms before the first buffer arrives, the previous card's
 * teardown had to be awaited before the next could start (racing the audio HAL
 * when it didn't settle), and a stream that failed to open left the card with a
 * microphone that never worked. `AudioRecorder.pause()` / `.resume()` restart an
 * already-open stream instead, which skips device negotiation entirely.
 *
 * Ported from edemind's recording.ts.
 */
import { Platform } from 'react-native';
import { AudioManager, AudioRecorder, type AudioBuffer } from 'react-native-audio-api';

import { mark as diagMark, recordPromptToMic, span as diagSpan } from '@/utils/reviewDiagnostics';

interface AudioReadyEvent {
  buffer: AudioBuffer;
  numFrames: number;
  when: number;
}

/** Parakeet expects 16 kHz mono. */
export const TARGET_SAMPLE_RATE = 16000;

/**
 * The gate decides in dBFS against a floor measured from the room, because the
 * absolute RMS of the same voice moves by more than the distance between speech
 * and silence.
 *
 * Field evidence (`voice_grading_attempts`, 600 recordings over 12 days). Every
 * session up to 2026-08-18 07:08 captured speech at a median peak of
 * 0.005–0.013 RMS (−46 to −38 dBFS). From 2026-08-18 20:17 the median jumped to
 * 0.045–0.093 (−27 to −21 dBFS) — **17 dB louder** — and the only thing that
 * changed was the Advanced "iOS raw mode" toggle going off, which swaps the
 * session mode from `measurement` (no AGC) to `default` (AGC on).
 *
 * The old gate keyed off two absolute constants, ABS_SPEECH_FLOOR = 0.003 and
 * ABS_SILENCE_FLOOR = 0.0018. In the quiet regime those sat neatly between room
 * tone and speech. In the loud regime AGC lifted *room tone* to 0.003–0.006 —
 * over the speech floor — so the gate declared speech on an empty room the
 * instant a window opened, waited out `silenceHangMs`, and closed ~1.2 s later
 * with nothing recorded. Eight such windows are in the table, all after the
 * regime change, all `stop_reason: 'silence'`, `buffer_count: 12–15`,
 * `peak_rms: 0.0035–0.0064`, transcript empty. This is the third time an
 * absolute floor has been invalidated by a capture-gain change (see the
 * Bluetooth-HFP note in __tests__/lib/voice/energyGate.test.ts) — so the
 * absolute numbers are gone, and what remains is a margin over the measured
 * room, which is the same quantity in both regimes: speech ran 20–30 dB over
 * room tone on every session in the corpus.
 */
export function dbfs(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-7));
}

/**
 * The noise floor is the quietest buffer in a trailing window (minimum
 * statistics), not a running average.
 *
 * The previous estimator snapped down to the quietest sample ever seen and rose
 * 1% per buffer — a half-life of ~7 s inside a 2.5 s recording, i.e. it never
 * adapted, which is why the relative thresholds always collapsed onto the
 * absolute ones. A trailing minimum tracks a room that gets louder (old quiet
 * samples age out) without ever being dragged up onto the learner's own voice
 * (a 2.5 s utterance cannot fill a 5 s window), and needs no speech/non-speech
 * decision to maintain — which matters, since that decision is what it feeds.
 */
const NOISE_WINDOW_MS = 5000;

/**
 * Which point of that window is "the room": the 20th percentile, not the
 * strict minimum.
 *
 * A room does not sit at one level — it wanders several dB buffer to buffer, so
 * its quietest instant is several dB below anything typical. Reading the floor
 * off that instant sets the onset threshold too low, the room's own peaks cross
 * it, and every crossing resets the hang timers — which is the "recording never
 * ends, learner repeats themselves" failure arriving by a second route. A low
 * percentile lands in the body of the room's distribution instead, while still
 * being immune to the learner's voice: speech would have to fill four fifths of
 * the window before it could reach this rank.
 */
const NOISE_PERCENTILE = 0.2;

/** A buffer quieter than this is a dead stream, not a quiet room; letting it
 *  into the floor would make every later buffer look like speech. */
const FLOOR_MIN_DBFS = -75;
/** Ceiling on the floor, so a burst of noise can never lift the onset
 *  threshold above ordinary speech. */
const FLOOR_MAX_DBFS = -25;
/** Floor used before any audio has arrived. Only ever reached on the first
 *  buffer of the first card — the estimate is carried between cards. */
const COLD_FLOOR_DBFS = -60;
/** Speech is not confirmed until the floor has seen this much audio. Without
 *  it the first buffer of a session is measured against a guess. Carried state
 *  means only the very first card of a session ever waits. */
const FLOOR_WARMUP_MS = 300;
/** Absolute backstop on the onset threshold, kept only for the pathological
 *  case of a floor pinned at FLOOR_MIN_DBFS. −66 dBFS is 13 dB under the
 *  quietest genuine speech in the corpus (0.0023 RMS, −52.6 dBFS). */
const ABS_ONSET_DBFS = -66;

/**
 * How long a capture window waits for its first buffer before declaring the
 * stream dead.
 *
 * With a session-scoped recorder the stream is already open and warm, so a
 * resumed window should deliver audio in tens of milliseconds. If it hasn't
 * after this long, something outside our control took the input away (an
 * interruption we missed, the audio engine stopping, a route change mid-word) —
 * and the honest response is to fail fast so the caller's retry ladder can
 * reopen the session. Previously this state was indistinguishable from silence
 * and the learner sat on "Listening…" for the full `noSpeechTimeoutMs`.
 *
 * 700 rather than the 1500 it started at. A healthy warm window was measured on
 * device at ~120 ms to first buffer, so this is still ~6x headroom — while the
 * old value meant a deaf stream cost a second and a half before the recovery
 * reopen even began, and every millisecond of it is billed to the learner's tap.
 */
const WINDOW_FIRST_BUFFER_TIMEOUT_MS = 700;

/** Audio kept either side of the detected speech before transcription. Enough
 *  that a soft onset or a trailing consonant is never clipped, short enough
 *  that the recogniser isn't handed seconds of room tone to decode. */
const TRIM_PREROLL_MS = 200;
const TRIM_POSTROLL_MS = 250;

/** Envelope entries kept per window. 160 buffers is the 15 s cap at 100 ms,
 *  so nothing real is ever truncated; the bound exists so a device that
 *  delivers tiny buffers cannot grow the telemetry row without limit. */
const MAX_LOGGED_LEVELS = 160;

/**
 * The iOS session mode held for the whole review session.
 *
 * Capture used to run in `'spokenAudio'` and playback had to be restored to
 * `'default'` afterwards, because iOS keeps applying the recording mode and
 * every prompt after the first recording played noticeably quiet. With one
 * session spanning both, that flap is gone and a single mode has to serve both
 * — so it is the one that was already proven right for playback. Field
 * telemetry (`voice_grading_attempts`) showed transcription accuracy was never
 * the constraint, which is what makes this the cheap side of the trade.
 * `'measurement'` (no input AGC / noise processing) is still reachable through
 * the Advanced iOS raw-mode toggle for A/B testing quiet capture.
 */
const IOS_SESSION_MODE = 'default';

export interface RecordingConfig {
  energyGateEnabled: boolean;
  /** dB above the measured room a buffer must reach to count as voice. 12 dB
   *  is a quarter of the 20–30 dB margin real speech held over room tone in
   *  every session of the corpus, and well clear of the 3–6 dB that AGC-lifted
   *  room tone reached. */
  onsetMarginDb: number;
  /** dB above the room below which a buffer counts as silence. The gap between
   *  this and `onsetMarginDb` is the hysteresis band — audio inside it is
   *  neither, and is what `idleHangMs` exists to resolve. */
  releaseMarginDb: number;
  /** Consecutive ms over the onset threshold before speech is CONFIRMED. A
   *  single buffer of anything — a chair, a breath, a door — used to latch the
   *  gate into "the learner has spoken", after which 900 ms of quiet closed the
   *  window on someone who had not started yet. */
  onsetConfirmMs: number;
  /** Voiced ms a window must hold before the gate may end it on silence. The
   *  second half of the same guard: a transient that clears `onsetConfirmMs`
   *  still cannot end the recording, it only opens it. Below any real answer
   *  ("draw", the shortest gloss in the corpus, runs ~400 ms). */
  minSpeechMs: number;
  /** Voiced ms that makes the gate CONFIDENT it heard an answer rather than a
   *  noise that lasted. Below it both hang timers are doubled, so a room
   *  flutter that scrapes past `minSpeechMs` has to be followed by nearly two
   *  seconds of quiet before it can end a window — by which time a learner who
   *  was merely slow to start has spoken and reset it. A genuinely short answer
   *  pays those extra ms once; the alternative is losing it entirely. */
  confidentSpeechMs: number;
  silenceHangMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  /** Dead-air bail: if the gate never registers speech, stop after this long
   *  instead of waiting out maxDurationMs. Only applies while speechSeen is
   *  false, so it never cuts off someone who actually started talking. */
  noSpeechTimeoutMs: number;
  /** Backstop for the gap between the two thresholds. Speech ends at
   *  `silenceThreshold` but restarts at the higher `speechThreshold`; audio
   *  parked between them is neither, so `silenceMs` stops accumulating and the
   *  recording can only end at `maxDurationMs`. Room tone landing in that band
   *  is what pinned real sessions to the 15 s cap. This is the same hang timer
   *  measured against the *speech* threshold: quiet enough to not be speech,
   *  for long enough, ends the recording whatever the noise floor is doing.
   *  Necessarily ≥ `silenceHangMs`, so a genuinely quiet room still wins. */
  idleHangMs: number;
  gainNormalizeEnabled: boolean;
  captureTarget: number;
  captureMaxGain: number;
  /** iOS only: use the 'measurement' session mode (raw — no input AGC / noise
   *  processing) instead of the shared session mode. Off by default; exposed as
   *  an Advanced toggle so quiet-capture issues can be A/B tested on-device. */
  iosRawMode: boolean;
}

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  energyGateEnabled: true,
  onsetMarginDb: 12,
  releaseMarginDb: 6,
  onsetConfirmMs: 200,
  minSpeechMs: 250,
  confidentSpeechMs: 400,
  silenceHangMs: 900,
  minDurationMs: 600,
  // 15 s matches the edenmind-v2 reference that's known to grade well on
  // device; 10 s left too little headroom for slow / hesitating speakers
  // before the energy gate's silenceHangMs (900 ms) could fire.
  maxDurationMs: 15000,
  // No speech at all in 8 s means the mic isn't hearing the user (too quiet /
  // permission edge / silence). Bail to grading + the reveal fallback rather
  // than stranding them on "Listening…" for the full 15 s cap.
  noSpeechTimeoutMs: 8000,
  // 1.5x silenceHangMs: long enough that the quiet-room path (900 ms) still
  // decides normally, short enough that a learner who has stopped talking is
  // never left waiting on the 15 s cap.
  idleHangMs: 1350,
  gainNormalizeEnabled: true,
  captureTarget: 0.7,
  captureMaxGain: 60,
  iosRawMode: false,
};

/**
 * What stopped a recording window: 'silence' (energy gate), 'noSpeech' (gate
 * never heard speech within noSpeechTimeoutMs), 'maxDuration' (hit cap inside
 * handleBuffer), 'watchdog' (a cap fired with zero buffers — either the hard
 * duration cap or the first-buffer deadline), or 'manual' (cancel / external
 * stop).
 *
 * Named because this value travels: the review HUD prints it and every voice
 * attempt writes it to `voice_grading_attempts`. Both of those ends typed it as
 * a bare `string`, so the analysis we keep this column FOR could have been
 * quietly polluted by a sixth spelling that nothing rejected.
 */
export type RecordingStopReason = 'silence' | 'noSpeech' | 'maxDuration' | 'watchdog' | 'manual';

/**
 * Why a request for the microphone did not produce audio.
 *
 * Lives here, at the leaf of the voice stack, so the provider that RETURNS one
 * and the telemetry that RECORDS one share a single set rather than a union on
 * one side and a `string` plus a doc-comment listing the same four names on the
 * other.
 */
export type VoiceArmFailureReason = 'permission' | 'not-ready' | 'busy' | 'error';

export interface RecordingResult {
  waveform: Float32Array;
  sampleRate: number;
  durationMs: number;
  heardSpeech: boolean;
  peakRms: number;
  /** The room, in dBFS, as the gate finally measured it. */
  noiseFloorDb: number;
  /** Total ms the gate counted as voice. Separates "heard a word" from "heard
   *  a door close" in a way `heardSpeech` alone cannot. */
  speechMs: number;
  /** Per-buffer level in dBFS, rounded, oldest first — the recording's
   *  envelope. `peak_rms` is one number for a whole window, which is why three
   *  separate gate regressions each needed a live session to diagnose: it
   *  cannot show WHERE the energy was. Capped, and small enough to ride along
   *  in the telemetry row that is written anyway. */
  levelsDb: number[];
  /** Number of audio buffers the window received. 0 means the mic delivered
   *  no audio at all (session conflict / permission edge case). */
  bufferCount: number;
  /** What stopped the recording — see RecordingStopReason. */
  stopReason: RecordingStopReason;
  /** Wall-clock ms from the window opening to its first buffer. Reveals whether
   *  the mic actually delivered audio and how slow startup was. This is the
   *  number the session-scoped recorder exists to reduce. */
  firstBufferMs: number | null;
  /** Wall-clock ms from the window opening to the moment the stop decision was
   *  taken (energy gate, max cap, watchdog, or cancel/manual). */
  stopDecidedAtMs: number;
}

/** Mutable state the energy gate carries between buffers. */
export interface EnergyGateState {
  /** Trailing per-buffer levels in dBFS, oldest first. The noise floor is the
   *  minimum of these — see NOISE_WINDOW_MS. */
  levels: readonly number[];
  /** The room in dBFS: `min(levels)`, clamped. */
  noiseFloorDb: number;
  /** Speech has been CONFIRMED — a run of `onsetConfirmMs` over the onset
   *  threshold, not a single buffer that happened to be loud. */
  speechSeen: boolean;
  /** ms of the current unbroken run over the onset threshold, before
   *  confirmation. Reset by any buffer that falls back under it. */
  onsetMs: number;
  /** Total ms this window has counted as voice. */
  speechMs: number;
  /** ms below the release threshold since speech was last heard. */
  silenceMs: number;
  /** ms below the onset threshold since speech was last heard. Always ≥
   *  `silenceMs`, and the one that survives a raised noise floor. */
  idleMs: number;
}

/**
 * A fresh gate for one card, optionally seeded from the previous card's.
 *
 * Seeding is what makes the room measurement usable on the first buffer: cards
 * are seconds apart in the same room, so the previous window's trailing levels
 * are a better estimate than anything the new window can have yet. Without it
 * every card spends its `FLOOR_WARMUP_MS` re-learning what it already knew, and
 * a learner who answers instantly is measured against a guess.
 */
export function initialGateState(
  seed?: Pick<EnergyGateState, 'levels' | 'noiseFloorDb'>,
): EnergyGateState {
  return {
    levels: seed?.levels ?? [],
    noiseFloorDb: seed?.noiseFloorDb ?? COLD_FLOOR_DBFS,
    speechSeen: false,
    onsetMs: 0,
    speechMs: 0,
    silenceMs: 0,
    idleMs: 0,
  };
}

/**
 * One buffer's worth of energy-gate decision, as a pure function so it can be
 * tested without a microphone. It has been wrong three times in production, and
 * every time the mechanism was the same: an ABSOLUTE RMS threshold that a
 * capture-gain change moved out from under. Twice the symptom was a recording
 * that ran to `maxDurationMs` while the learner repeated themselves into a
 * microphone that appeared dead; the third time (2026-08-18, iOS AGC) it was the
 * mirror image — a window that closed 1.2 s after opening because room tone was
 * loud enough to read as an answer.
 *
 * So there are no absolute levels here any more. A buffer is voice when it is
 * `onsetMarginDb` over the room and stays there for `onsetConfirmMs`; the room
 * is the quietest buffer in the last NOISE_WINDOW_MS. Both regimes in the
 * corpus — AGC on and off, 17 dB apart — put speech 20–30 dB over their own
 * room tone, which is the invariant this reads.
 *
 * Returns the next state, whether this buffer counted as voice, and the stop
 * reason if any. `isSpeech` is reported rather than re-derived by the caller
 * because it is what bounds the region actually sent to the recogniser.
 */
export function stepEnergyGate(
  state: EnergyGateState,
  sample: { rms: number; bufferMs: number; elapsedMs: number },
  config: RecordingConfig,
): { state: EnergyGateState; isSpeech: boolean; stop: RecordingResult['stopReason'] | null } {
  const { rms, bufferMs, elapsedMs } = sample;
  const db = dbfs(rms);

  // The floor is fed a CLAMPED level: a dropout must not pin it at −140 dB
  // (which would make every later buffer look like speech), and a sustained
  // roar must not lift it over ordinary talking.
  const capacity = Math.max(1, Math.round(NOISE_WINDOW_MS / Math.max(bufferMs, 1)));
  const levels = [...state.levels, Math.min(FLOOR_MAX_DBFS, Math.max(FLOOR_MIN_DBFS, db))].slice(
    -capacity,
  );
  // `levels` always holds the buffer just pushed, so the fallback is never
  // reached; sorting ~50 numbers ten times a second costs nothing.
  const ranked = [...levels].sort((a, b) => a - b);
  const noiseFloorDb =
    ranked[Math.min(ranked.length - 1, Math.floor(ranked.length * NOISE_PERCENTILE))] ??
    COLD_FLOOR_DBFS;
  const warm = levels.length * bufferMs >= FLOOR_WARMUP_MS;

  const onsetDb = config.energyGateEnabled
    ? Math.max(ABS_ONSET_DBFS, noiseFloorDb + config.onsetMarginDb)
    : -Infinity;
  const releaseDb = config.energyGateEnabled
    ? Math.min(onsetDb, noiseFloorDb + config.releaseMarginDb)
    : -Infinity;

  let { speechSeen, onsetMs, speechMs, silenceMs, idleMs } = state;

  // Deliberately not a two-state machine: `isSpeech` is always "over the onset
  // threshold", and the hysteresis lives in the two timers instead. Audio in
  // the band between the thresholds accrues `idleMs` but not `silenceMs`, which
  // is what stops that band from being a state the gate can never leave.
  const isSpeech = db >= onsetDb;
  const aboveRelease = db >= releaseDb;

  if (!speechSeen) {
    onsetMs = isSpeech ? onsetMs + bufferMs : 0;
    if (onsetMs >= config.onsetConfirmMs && (warm || !config.energyGateEnabled)) speechSeen = true;
  }

  if (isSpeech) {
    speechMs += bufferMs;
    silenceMs = 0;
    idleMs = 0;
  } else if (speechSeen) {
    idleMs += bufferMs;
    if (!aboveRelease) silenceMs += bufferMs;
  }

  const next = { levels, noiseFloorDb, speechSeen, onsetMs, speechMs, silenceMs, idleMs };
  // Confirmed speech opens the window; only ENOUGH speech may close it. A
  // transient that clears `onsetConfirmMs` and then stops leaves the recording
  // running for the learner who has not spoken yet, and bails as `noSpeech`
  // rather than the 15 s cap if they never do.
  const spokeEnough = speechSeen && speechMs >= config.minSpeechMs;
  const pastMinimum = elapsedMs >= config.minDurationMs;
  // Little speech, so wait twice as long for the quiet to prove it was an
  // answer and not the room. See `confidentSpeechMs`.
  const unsure = speechMs < config.confidentSpeechMs ? 2 : 1;
  const quietEnough = spokeEnough && silenceMs >= config.silenceHangMs * unsure && pastMinimum;
  const idleEnough = spokeEnough && idleMs >= config.idleHangMs * unsure && pastMinimum;
  const nothingHeard = !spokeEnough && elapsedMs >= config.noSpeechTimeoutMs;

  if (quietEnough || idleEnough) return { state: next, isSpeech, stop: 'silence' };
  if (nothingHeard) return { state: next, isSpeech, stop: 'noSpeech' };
  if (elapsedMs >= config.maxDurationMs) return { state: next, isSpeech, stop: 'maxDuration' };
  return { state: next, isSpeech, stop: null };
}

export interface RecordingHandlers {
  onAutoStop?: () => void;
  /** Fired once, when the window's first audio buffer arrives — i.e. the
   *  microphone is genuinely capturing for THIS card. */
  onCapturing?: () => void;
  /** Per-buffer RMS (~10 Hz), for a live input meter. Deliberately a bare
   *  number and not a state setter: the consumer writes it straight into a
   *  Reanimated shared value, so the meter costs no React render. The energy
   *  gate reads the same figure — this is a tap on it, not a second measure. */
  onLevel?: (rms: number) => void;
}

export class MicPermissionDeniedError extends Error {
  constructor() {
    super('Microphone permission denied');
    this.name = 'MicPermissionDeniedError';
  }
}

/** Exported so the review session can ask for the mic BEFORE a card is waiting
 *  on it — see VoiceGradingProvider.prewarmPermission. Idempotent: once granted
 *  it is a cheap native check. */
export async function ensureMicPermission(): Promise<boolean> {
  // A grant is cached for the process lifetime because this now runs on the
  // critical path of EVERY card, not once per session: the input stream is
  // closed for each prompt (so the word plays at full volume) and reopened
  // afterwards, and `openInternal` re-checks permission on every reopen. Both
  // platforms terminate the app when the user revokes a permission from
  // Settings, so a cached grant cannot outlive the truth.
  if (permissionGranted) return true;
  const current = await AudioManager.checkRecordingPermissions();
  if (current === 'Granted') {
    permissionGranted = true;
    return true;
  }
  const requested = await AudioManager.requestRecordingPermissions();
  permissionGranted = requested === 'Granted';
  return permissionGranted;
}

/** Set once the OS has said yes; see ensureMicPermission for why it sticks. */
let permissionGranted = false;

/**
 * Claim the audio session the review screen needs for its whole life: playback
 * for prompts, capture for answers, from one category so neither has to take it
 * from the other mid-card.
 *
 * `iosAllowHaptics` is load-bearing rather than cosmetic. iOS silences haptics
 * while a session is record-capable, and that window is now the entire review
 * instead of one card's recording — so without it the swipe detent tick, the
 * grade feedback and the reveal tap all go dead on iOS for the whole session.
 */
function configureVoiceSessionOptions(config: RecordingConfig): void {
  if (Platform.OS !== 'ios') return;
  AudioManager.setAudioSessionOptions({
    iosCategory: 'playAndRecord',
    iosMode: config.iosRawMode ? 'measurement' : IOS_SESSION_MODE,
    // No Bluetooth HFP: a connected headset would route the mic to an
    // ~8 kHz narrowband channel and strip the consonant cues Parakeet
    // needs. Force the full-band built-in mic.
    iosOptions: ['defaultToSpeaker'],
    iosAllowHaptics: true,
  });
}

function concat(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Windowed-sinc (Hann) low-pass FIR applied before decimation. Without this,
 * downsampling folds energy above the new Nyquist back into the speech band
 * and smears the fricatives ASR leans on. 33 taps; unity DC gain.
 */
function lowPass(input: Float32Array, cutoff: number): Float32Array {
  const half = 16;
  const taps = half * 2 + 1;
  const kernel = new Float32Array(taps);
  let sum = 0;
  for (let n = 0; n < taps; n++) {
    const x = n - half;
    const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (taps - 1));
    kernel[n] = sinc * hann;
    sum += kernel[n] ?? 0;
  }
  for (let n = 0; n < taps; n++) kernel[n] = (kernel[n] ?? 0) / sum;
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let acc = 0;
    for (let k = 0; k < taps; k++) {
      const idx = i + k - half;
      if (idx >= 0 && idx < input.length) acc += (input[idx] ?? 0) * (kernel[k] ?? 0);
    }
    out[i] = acc;
  }
  return out;
}

function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to || input.length === 0) return input;
  const ratio = from / to;
  const source = ratio > 1 ? lowPass(input, 0.5 / ratio) : input;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, source.length - 1);
    const frac = pos - i0;
    out[i] = (source[i0] ?? 0) * (1 - frac) + (source[i1] ?? 0) * frac;
  }
  return out;
}

/**
 * Gently peak-normalize. No-op when the peak is at/above `target` or below the
 * noise floor; gain is capped so a faint recording isn't amplified into noise.
 */
function normalizeGain(
  input: Float32Array,
  target = 0.7,
  maxGain = 12,
): { output: Float32Array; gainApplied: number | null } {
  // Indexed for the same reason as the per-buffer RMS: this walks the whole
  // recording, synchronously, immediately before the recogniser is handed it.
  let peak = 0;
  const length = input.length;
  for (let i = 0; i < length; i += 1) {
    const a = Math.abs(input[i] ?? 0);
    if (a > peak) peak = a;
  }
  if (peak < 1e-3 || peak >= target) return { output: input, gainApplied: null };
  const gain = Math.min(target / peak, maxGain);
  if (gain <= 1) return { output: input, gainApplied: null };
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = (input[i] ?? 0) * gain;
  return { output: out, gainApplied: gain };
}

/**
 * Narrow a recording to the part the learner actually spoke.
 *
 * The captured buffer runs from the moment the window opened to the moment the
 * gate called time — so it carries the learner's thinking pause at the front and
 * the full `silenceHangMs` / `idleHangMs` hang at the back. Both ends are pure
 * cost twice over: `transcribeSamples` takes a `number[]`, so every sample is
 * converted through `Array.from` on the JS thread before an offline transducer
 * decodes it, and decode time scales with length.
 *
 * Returns the input untouched when no speech was located, so a silent or
 * hallucinated recording still reaches the recogniser exactly as it was heard.
 * Covered end-to-end by __tests__/lib/voice/captureSession.test.ts.
 */
function trimToSpeech(
  input: Float32Array,
  range: { firstSpeechSample: number | null; lastSpeechSample: number | null },
  sampleRate: number,
): Float32Array {
  const { firstSpeechSample, lastSpeechSample } = range;
  if (firstSpeechSample === null || lastSpeechSample === null) return input;
  if (lastSpeechSample <= firstSpeechSample) return input;

  const start = Math.max(0, firstSpeechSample - Math.round((TRIM_PREROLL_MS * sampleRate) / 1000));
  const end = Math.min(
    input.length,
    lastSpeechSample + Math.round((TRIM_POSTROLL_MS * sampleRate) / 1000),
  );
  if (start >= end || (start === 0 && end === input.length)) return input;
  return input.subarray(start, end);
}

/**
 * The microphone for a whole review session.
 *
 * `open()` once when the session starts, then `beginWindow()` / `endWindow()`
 * per card. Buffers that arrive while no window is open are discarded, which is
 * what makes it safe for the stream to keep running between cards — and what
 * makes correctness independent of whether the native `pause()` actually took
 * effect on a given device.
 */
export class VoiceCaptureSession {
  private recorder: AudioRecorder | null = null;
  private opening: Promise<void> | null = null;
  private streamErrorHandler: ((message: string) => void) | null = null;

  // Per-window state. All of it is reset by beginWindow().
  private windowOpen = false;
  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private sourceSampleRate = TARGET_SAMPLE_RATE;
  private startedAt = 0;
  private gate: EnergyGateState = initialGateState();
  private peakRms = 0;
  private stopping = false;
  private handlers: RecordingHandlers = {};
  private config: RecordingConfig = { ...DEFAULT_RECORDING_CONFIG };
  private bufferCount = 0;
  private levelsDb: number[] = [];
  /** Carried across cards so a new window measures the room from the room, not
   *  from a constant. Same session, same seconds-old room. */
  private roomEstimate: Pick<EnergyGateState, 'levels' | 'noiseFloorDb'> | null = null;
  /** Where the run that eventually confirmed speech began, so the trim keeps
   *  the whole first syllable rather than starting at the confirmation. */
  private candidateStartSample: number | null = null;
  private stopReason: RecordingResult['stopReason'] = 'manual';
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private firstBufferTimer: ReturnType<typeof setTimeout> | null = null;
  private firstBufferAt: number | null = null;
  private stopDecidedAt = 0;
  /** Sample offsets (at source rate) bounding the speech the gate detected. */
  private firstSpeechSample: number | null = null;
  private lastSpeechSample: number | null = null;

  /** The native input stream is open (whether or not a card is capturing). */
  get isOpen(): boolean {
    return this.recorder !== null;
  }

  /** A card's capture window is currently accepting audio. */
  get isCapturing(): boolean {
    return this.windowOpen;
  }

  /** Called when the native recorder reports an error. Registering this is the
   *  only way a stream that dies mid-session announces itself; without it the
   *  symptom is a card that silently records nothing. */
  onStreamError(handler: ((message: string) => void) | null): void {
    this.streamErrorHandler = handler;
  }

  /**
   * Open the input stream for the session. Idempotent and safe to call
   * concurrently — the second caller awaits the first's attempt.
   */
  async open(config: RecordingConfig = DEFAULT_RECORDING_CONFIG): Promise<void> {
    if (this.recorder) return;
    if (this.opening) return this.opening;
    this.opening = this.openInternal(config).finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async openInternal(config: RecordingConfig): Promise<void> {
    // Normally a no-op re-check; on a first run it opens the OS permission
    // dialog. VoiceGradingProvider.prewarmPermission moves that ask to the start
    // of the session so it can't land mid-card.
    const endPermission = diagSpan('mic.permission');
    const allowed = await ensureMicPermission();
    endPermission({ allowed });
    if (!allowed) throw new MicPermissionDeniedError();

    this.config = config;

    // Applied once for the whole session rather than per card. The category
    // change plus activation is the one call on this path that can block for
    // seconds on iOS (another process holding the session, a Bluetooth route
    // renegotiating), and it used to run on every single card.
    const endSession = diagSpan('mic.session.configure');
    try {
      configureVoiceSessionOptions(config);
      if (Platform.OS === 'ios') {
        await AudioManager.setAudioSessionActivity(true);
      }
      endSession();
    } catch (sessionErr) {
      endSession({ failed: true });
      diagMark('mic.session.configure.failed', {
        message: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
      });
      // Surface the real error from start() below.
    }

    const recorder = new AudioRecorder();
    // 1600 samples ≈ 100 ms at 16 kHz: fine enough for the energy gate.
    const ready = recorder.onAudioReady(
      { sampleRate: TARGET_SAMPLE_RATE, bufferLength: 1600, channelCount: 1 },
      event => this.handleBuffer(event),
    );
    if (ready.status === 'error') throw new Error(`onAudioReady failed: ${ready.message}`);

    recorder.onError(({ message }) => {
      diagMark('mic.stream.error', { message });
      this.streamErrorHandler?.(message);
    });

    const endStart = diagSpan('mic.stream.open');
    const started = await recorder.start();
    if (started.status === 'error') {
      endStart({ failed: true });
      recorder.clearOnAudioReady();
      recorder.clearOnError();
      throw new Error(`recorder.start failed: ${started.message}`);
    }
    endStart();
    this.recorder = recorder;

    // Idle until a card asks for it. Buffers are discarded either way (see
    // handleBuffer), so this is a power optimisation rather than the guarantee.
    recorder.pause();
  }

  /**
   * Begin capturing for one card. Resumes the already-open stream, which is the
   * whole point of the session-scoped design: there is no device negotiation,
   * no permission round-trip and no audio-session change on this path.
   */
  beginWindow(handlers: RecordingHandlers = {}, config?: RecordingConfig): void {
    if (this.windowOpen) return;

    this.config = config ?? { ...DEFAULT_RECORDING_CONFIG };
    this.chunks = [];
    this.totalSamples = 0;
    this.sourceSampleRate = TARGET_SAMPLE_RATE;
    this.gate = initialGateState(this.roomEstimate ?? undefined);
    this.peakRms = 0;
    this.levelsDb = [];
    this.candidateStartSample = null;
    this.stopping = false;
    this.handlers = handlers;
    this.startedAt = Date.now();
    this.bufferCount = 0;
    this.stopReason = 'manual';
    this.firstBufferAt = null;
    this.stopDecidedAt = 0;
    this.firstSpeechSample = null;
    this.lastSpeechSample = null;
    this.windowOpen = true;

    const endResume = diagSpan('mic.window.resume');
    this.recorder?.resume();
    endResume();

    // Safety net: if no buffers arrive (the audio engine stopped, an
    // interruption we didn't see, a route change) the maxDuration check inside
    // handleBuffer never runs and the caller would hang. Wall-clock timer
    // enforces the cap with a small margin so a normal handleBuffer-driven stop
    // still wins the race.
    const watchdogDelay = this.config.maxDurationMs + 500;
    this.watchdog = setTimeout(() => this.forceStop('watchdog', watchdogDelay), watchdogDelay);

    // A resumed stream should deliver audio almost immediately. If it doesn't,
    // fail now rather than making the learner wait out noSpeechTimeoutMs on a
    // microphone that is never going to speak.
    this.firstBufferTimer = setTimeout(
      () => this.forceStop('watchdog', WINDOW_FIRST_BUFFER_TIMEOUT_MS),
      WINDOW_FIRST_BUFFER_TIMEOUT_MS,
    );
  }

  /** Stop from a timer rather than from the gate. */
  private forceStop(reason: RecordingResult['stopReason'], scheduled: number): void {
    if (this.stopping || !this.windowOpen) return;
    const at = Date.now() - this.startedAt;
    diagMark('mic.watchdog', { at, scheduled, reason, buffers: this.bufferCount });
    this.stopping = true;
    this.stopReason = reason;
    this.stopDecidedAt = at;
    this.handlers.onAutoStop?.();
  }

  private handleBuffer(event: AudioReadyEvent): void {
    // Between cards the stream may still be live (pause() is best-effort and
    // platform-dependent). Anything arriving now belongs to no card.
    if (!this.windowOpen) return;

    const channel = event.buffer.getChannelData(0);
    this.sourceSampleRate = event.buffer.sampleRate;
    const bufferStartSample = this.totalSamples;
    this.chunks.push(channel.slice());
    this.totalSamples += channel.length;
    this.bufferCount += 1;
    if (this.firstBufferAt === null) {
      this.firstBufferAt = Date.now() - this.startedAt;
      if (this.firstBufferTimer) {
        clearTimeout(this.firstBufferTimer);
        this.firstBufferTimer = null;
      }
      // The number behind "I have to wait for the mic": how long after the
      // window opened the microphone actually began delivering audio. With the
      // stream held open across cards this should be tens of ms, not hundreds.
      diagMark('mic.firstBuffer', {
        ms: this.firstBufferAt,
        // If this is not TARGET_SAMPLE_RATE, every buffer pays the JS-side
        // low-pass + decimate in endWindow() — worth knowing before optimising it.
        sourceSampleRate: this.sourceSampleRate,
        frames: channel.length,
      });
      recordPromptToMic(this.firstBufferAt);
      this.handlers.onCapturing?.();
    }

    // Indexed rather than for..of: this runs over every sample of every buffer,
    // ten times a second for as long as the learner is speaking, and the
    // iterator protocol allocates per step where an index does not.
    let sumSquares = 0;
    const frames = channel.length;
    for (let i = 0; i < frames; i += 1) {
      const sample = channel[i] ?? 0;
      sumSquares += sample * sample;
    }
    const rms = frames ? Math.sqrt(sumSquares / frames) : 0;
    const elapsed = Date.now() - this.startedAt;
    const bufferMs = (event.numFrames / (this.sourceSampleRate || TARGET_SAMPLE_RATE)) * 1000;
    if (rms > this.peakRms) this.peakRms = rms;
    this.handlers.onLevel?.(rms);

    if (this.levelsDb.length < MAX_LOGGED_LEVELS)
      this.levelsDb.push(Math.round(rms > 0 ? dbfs(rms) : FLOOR_MIN_DBFS));

    const wasConfirmed = this.gate.speechSeen;
    const hadCandidate = this.gate.onsetMs > 0;
    const { state, isSpeech, stop } = stepEnergyGate(
      this.gate,
      { rms, bufferMs, elapsedMs: elapsed },
      this.config,
    );
    this.gate = state;

    // The speech region is bounded by CONFIRMED speech only. An unconfirmed
    // window leaves both marks null, so `trimToSpeech` hands the recogniser
    // everything it heard rather than a 100 ms clip of whatever tripped it.
    if (!wasConfirmed && !hadCandidate && state.onsetMs > 0) {
      this.candidateStartSample = bufferStartSample;
    }
    if (state.speechSeen) {
      if (this.firstSpeechSample === null) {
        this.firstSpeechSample = this.candidateStartSample ?? bufferStartSample;
      }
      if (isSpeech) this.lastSpeechSample = bufferStartSample + channel.length;
    }

    if (!this.stopping && stop !== null) {
      this.stopping = true;
      this.stopReason = stop;
      this.stopDecidedAt = elapsed;
      diagMark('mic.stopDecided', {
        reason: this.stopReason,
        at: elapsed,
        speechSeen: this.gate.speechSeen,
        speechMs: this.gate.speechMs,
        silenceMs: this.gate.silenceMs,
        idleMs: this.gate.idleMs,
        noiseFloorDb: Math.round(this.gate.noiseFloorDb),
        peakRms: Number(this.peakRms.toFixed(5)),
      });
      this.handlers.onAutoStop?.();
    }
  }

  /**
   * End the current card's window and return what was captured.
   *
   * Synchronous by design. This used to be an async `stop()` that tore the
   * stream down and then awaited an audio-session restore, and transcription
   * was serialised behind both — so the learner waited for a session hand-off
   * before the recogniser had even seen their answer. Now the pause is
   * immediate and the caller can start decoding on this same frame.
   */
  endWindow(): RecordingResult {
    const durationMs = Date.now() - this.startedAt;
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
    if (this.firstBufferTimer) {
      clearTimeout(this.firstBufferTimer);
      this.firstBufferTimer = null;
    }

    const wasOpen = this.windowOpen;
    this.windowOpen = false;
    this.handlers = {};

    if (wasOpen) {
      // Deferred by a microtask because the common caller is `onAutoStop`,
      // which fires from inside the native buffer callback — and `pause()` is
      // documented as JS-thread-only. The window is already closed, so any
      // buffer that slips through before the pause lands is discarded.
      const recorder = this.recorder;
      void Promise.resolve().then(() => {
        const endPause = diagSpan('mic.window.pause');
        recorder?.pause();
        endPause();
      });
    }

    // Hand this window's measurement of the room to the next card.
    if (this.bufferCount > 0) {
      this.roomEstimate = { levels: this.gate.levels, noiseFloorDb: this.gate.noiseFloorDb };
    }

    const merged = concat(this.chunks, this.totalSamples);
    this.chunks = [];
    const spoken = trimToSpeech(
      merged,
      { firstSpeechSample: this.firstSpeechSample, lastSpeechSample: this.lastSpeechSample },
      this.sourceSampleRate,
    );
    if (spoken.length !== merged.length) {
      diagMark('mic.trim', {
        fromSamples: merged.length,
        toSamples: spoken.length,
        rate: this.sourceSampleRate,
      });
    }
    const resampled = resample(spoken, this.sourceSampleRate, TARGET_SAMPLE_RATE);
    const { output: waveform } = this.config.gainNormalizeEnabled
      ? normalizeGain(resampled, this.config.captureTarget, this.config.captureMaxGain)
      : { output: resampled };

    const result: RecordingResult = {
      waveform,
      sampleRate: TARGET_SAMPLE_RATE,
      durationMs,
      heardSpeech: this.gate.speechSeen,
      peakRms: this.peakRms,
      noiseFloorDb: this.gate.noiseFloorDb,
      speechMs: this.gate.speechMs,
      levelsDb: this.levelsDb,
      bufferCount: this.bufferCount,
      stopReason: this.stopReason,
      firstBufferMs: this.firstBufferAt,
      stopDecidedAtMs: this.stopDecidedAt || durationMs,
    };
    this.totalSamples = 0;
    return result;
  }

  /** Abandon the current window without producing a result. */
  cancelWindow(): void {
    if (!this.windowOpen) return;
    this.stopping = true;
    this.stopReason = 'manual';
    this.endWindow();
  }

  /**
   * Tear the session's input stream down. Called when the review screen
   * unmounts, when voice is switched off mid-session, and before a reopen
   * forced by an interruption or route change.
   *
   * `releaseSession` additionally deactivates the iOS audio session, which is
   * what makes a post-interruption reopen actually work. Field evidence: after
   * a call, `recorder.start()` kept failing with "Failed to start audio engine
   * for recording" while the session reported `active=true`, `inputChannels=1`
   * and the built-in microphone present in the route. Nothing was wrong with
   * the session or the route — the engine had been torn down by the
   * interruption and never rebuilt, because `openInternal`'s
   * `setAudioSessionActivity(true)` is a no-op against a session iOS already
   * considers active. Deactivating first forces the activation to mean
   * something. Three arms failed this way in a row (each after exhausting its
   * retries) and the microphone stayed dead for the rest of the session.
   *
   * Off by default because the playback lane shares this session: an unmount or
   * a voice-off toggle must not deactivate a session the review prompt may
   * still be using. Only the "the input is broken, rebuild it" paths pass it.
   */
  async close({ releaseSession = false }: { releaseSession?: boolean } = {}): Promise<void> {
    this.cancelWindow();
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      try {
        // Stop BEFORE dropping the callbacks. The other order removes the
        // buffer tap while the engine is still running, which leaves the native
        // side stopping a stream whose sink has already gone.
        await recorder.stop();
        recorder.clearOnAudioReady();
        recorder.clearOnError();
      } catch {
        // The stream is gone either way; a failed teardown must not block the
        // caller, which is usually an unmount.
      }
    }
    if (releaseSession && Platform.OS === 'ios') {
      try {
        await AudioManager.setAudioSessionActivity(false);
      } catch {
        // Deactivation is refused whenever anything else still holds the
        // session. The reopen re-activates regardless, so this is a best-effort
        // nudge rather than a step the caller depends on.
      }
    }
  }
}
