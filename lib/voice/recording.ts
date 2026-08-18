/**
 * Microphone capture for the Practice "speak the English answer" flow. Records
 * mono PCM via react-native-audio-api and hands back a 16 kHz Float32Array —
 * exactly what Parakeet expects. Stopping is hands-free: a lightweight RMS
 * energy gate watches each buffer and auto-stops once the user has spoken and
 * then gone quiet, backed up by a hard duration cap.
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

// Absolute backstops for the otherwise-relative energy gate (the live threshold
// is noiseFloor × speechFactor). These match edenmind-v2, which grades reliably
// on device. They were briefly lowered to 0.001 / 0.0006 to catch very soft or
// distant speakers, but that dropped the silence floor so low that trailing
// room-tone rarely counted as silence — recordings ran long and fed Parakeet a
// noisy tail it tended to mis-decode. Reverted: the post-stop normalizeGain
// still boosts a quiet waveform, so prefer raising captureMaxGain / speechFactor
// over dropping these floors again if soft speakers stop registering.
const ABS_SPEECH_FLOOR = 0.003;
const ABS_SILENCE_FLOOR = 0.0018;
const INITIAL_NOISE_FLOOR = 0.005;

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
  speechFactor: number;
  silenceFactor: number;
  noiseRiseRate: number;
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
  speechFactor: 1.5,
  silenceFactor: 1.2,
  noiseRiseRate: 0.01,
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
  noiseFloor: number;
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
  noiseFloor: number;
  speechSeen: boolean;
  /** ms below `silenceThreshold` since speech was last heard. */
  silenceMs: number;
  /** ms below `speechThreshold` since speech was last heard. Always ≥
   *  `silenceMs`, and the one that survives a raised noise floor. */
  idleMs: number;
}
export function initialGateState(): EnergyGateState {
  return { noiseFloor: INITIAL_NOISE_FLOOR, speechSeen: false, silenceMs: 0, idleMs: 0 };
}

/**
 * One buffer's worth of energy-gate decision, as a pure function so it can be
 * tested without a microphone. It has been wrong twice in production — once
 * when the absolute floors were lowered and trailing room tone stopped counting
 * as silence, and once when dropping the forced Bluetooth-HFP route made capture
 * ~3x louder and pushed room tone above `ABS_SILENCE_FLOOR` — and both times the
 * symptom was a recording that ran to `maxDurationMs` while the learner repeated
 * themselves into a microphone that appeared dead.
 *
 * Returns the next state, whether this buffer counted as speech, and the stop
 * reason if any. `isSpeech` is reported rather than re-derived by the caller
 * because it is what bounds the region actually sent to the recogniser.
 */
export function stepEnergyGate(
  state: EnergyGateState,
  sample: { rms: number; bufferMs: number; elapsedMs: number },
  config: RecordingConfig,
): { state: EnergyGateState; isSpeech: boolean; stop: RecordingResult['stopReason'] | null } {
  const { rms, bufferMs, elapsedMs } = sample;
  const speechThreshold = config.energyGateEnabled
    ? Math.max(ABS_SPEECH_FLOOR, state.noiseFloor * config.speechFactor)
    : 0;
  const silenceThreshold = config.energyGateEnabled
    ? Math.max(ABS_SILENCE_FLOOR, state.noiseFloor * config.silenceFactor)
    : Infinity;

  let { noiseFloor, speechSeen, silenceMs, idleMs } = state;

  if (rms < noiseFloor) noiseFloor = rms;
  else if (config.energyGateEnabled && rms < speechThreshold)
    noiseFloor += (rms - noiseFloor) * config.noiseRiseRate;

  const isSpeech = !config.energyGateEnabled || rms >= speechThreshold;
  if (isSpeech) {
    speechSeen = true;
    silenceMs = 0;
    idleMs = 0;
  } else if (speechSeen) {
    // Below the speech threshold always counts as idle; only genuinely quiet
    // audio counts as silence. Tracking both is what stops the band between
    // them from being a state the gate can never leave.
    idleMs += bufferMs;
    if (rms < silenceThreshold) silenceMs += bufferMs;
  }

  const next = { noiseFloor, speechSeen, silenceMs, idleMs };
  const pastMinimum = elapsedMs >= config.minDurationMs;
  const quietEnough = speechSeen && silenceMs >= config.silenceHangMs && pastMinimum;
  const idleEnough = speechSeen && idleMs >= config.idleHangMs && pastMinimum;
  const noSpeechTimedOut = !speechSeen && elapsedMs >= config.noSpeechTimeoutMs;

  if (quietEnough || idleEnough) return { state: next, isSpeech, stop: 'silence' };
  if (noSpeechTimedOut) return { state: next, isSpeech, stop: 'noSpeech' };
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
    this.gate = initialGateState();
    this.peakRms = 0;
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

    const { state, isSpeech, stop } = stepEnergyGate(
      this.gate,
      { rms, bufferMs, elapsedMs: elapsed },
      this.config,
    );
    this.gate = state;

    if (isSpeech) {
      if (this.firstSpeechSample === null) this.firstSpeechSample = bufferStartSample;
      this.lastSpeechSample = bufferStartSample + channel.length;
    }

    if (!this.stopping && stop !== null) {
      this.stopping = true;
      this.stopReason = stop;
      this.stopDecidedAt = elapsed;
      diagMark('mic.stopDecided', {
        reason: this.stopReason,
        at: elapsed,
        speechSeen: this.gate.speechSeen,
        silenceMs: this.gate.silenceMs,
        idleMs: this.gate.idleMs,
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
      noiseFloor: this.gate.noiseFloor,
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
