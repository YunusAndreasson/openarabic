/**
 * Microphone capture for the Practice "speak the English answer" flow. Records
 * mono PCM via react-native-audio-api and hands back a 16 kHz Float32Array —
 * exactly what Parakeet expects. Stopping is hands-free: a lightweight RMS
 * energy gate watches each buffer and auto-stops once the user has spoken and
 * then gone quiet, backed up by a hard duration cap.
 *
 * Ported from edemind's recording.ts. Trimmed of the iosRawMode dev knob since
 * we are not tuning thresholds in production.
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
   *  processing) instead of 'spokenAudio'. Off by default; exposed as an
   *  Advanced toggle so quiet-capture issues can be A/B tested on-device. */
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

export interface RecordingResult {
  waveform: Float32Array;
  sampleRate: number;
  durationMs: number;
  heardSpeech: boolean;
  peakRms: number;
  noiseFloor: number;
  /** Number of audio buffers handleBuffer received. 0 means the mic delivered
   *  no audio at all (session conflict / permission edge case). */
  bufferCount: number;
  /** What stopped the recording: 'silence' (energy gate), 'noSpeech' (gate
   *  never heard speech within noSpeechTimeoutMs), 'maxDuration' (hit cap inside
   *  handleBuffer), 'watchdog' (cap fired with zero buffers), or 'manual'
   *  (cancel / external stop). */
  stopReason: 'silence' | 'noSpeech' | 'maxDuration' | 'watchdog' | 'manual';
  /** Wall-clock ms from start() to first handleBuffer call. Reveals whether
   *  the mic actually delivered audio and how slow startup was. */
  firstBufferMs: number | null;
  /** Wall-clock ms from start() to the moment the stop decision was taken
   *  (energy gate, max cap, watchdog, or cancel/manual). */
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
 * Returns the next state plus the stop reason, if any.
 */
export function stepEnergyGate(
  state: EnergyGateState,
  sample: { rms: number; bufferMs: number; elapsedMs: number },
  config: RecordingConfig,
): { state: EnergyGateState; stop: RecordingResult['stopReason'] | null } {
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

  if (quietEnough || idleEnough) return { state: next, stop: 'silence' };
  if (noSpeechTimedOut) return { state: next, stop: 'noSpeech' };
  if (elapsedMs >= config.maxDurationMs) return { state: next, stop: 'maxDuration' };
  return { state: next, stop: null };
}

export interface RecordingHandlers {
  onAutoStop?: () => void;
  /** Fired once, when the first audio buffer arrives — i.e. the microphone is
   *  genuinely capturing. start() resolving is NOT that moment: the input
   *  stream needs a few hundred ms more before samples flow. */
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
  const current = await AudioManager.checkRecordingPermissions();
  if (current === 'Granted') return true;
  const requested = await AudioManager.requestRecordingPermissions();
  return requested === 'Granted';
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
  let peak = 0;
  for (const sample of input) {
    const a = Math.abs(sample);
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
 * A single-shot microphone session. Construct once and keep across renders in
 * a ref; call start()/stop() per recording.
 */
export class VoiceRecorder {
  private recorder: AudioRecorder | null = null;
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
  private firstBufferAt: number | null = null;
  private stopDecidedAt = 0;

  get isRecording(): boolean {
    return this.recorder !== null;
  }

  async start(handlers: RecordingHandlers = {}, config?: RecordingConfig): Promise<void> {
    if (this.recorder) return;
    // Spanned: this is normally a no-op re-check, but on a first run it opens
    // the OS permission dialog and blocks here for as long as the learner takes
    // to answer — mid-card, with the UI showing nothing. It sits before
    // `startedAt` below, so firstBufferMs never counted it and the HUD's
    // "mic open Xms" silently under-reported the real wait.
    // See VoiceGradingProvider.prewarmPermission, which moves the ask to the
    // start of the session so it stops interrupting a card.
    const endPermission = diagSpan('mic.permission');
    const allowed = await ensureMicPermission();
    endPermission({ allowed });
    if (!allowed) throw new MicPermissionDeniedError();

    this.config = config ?? { ...DEFAULT_RECORDING_CONFIG };

    if (Platform.OS === 'ios') {
      // Spanned for the same reason: an AVAudioSession category change plus
      // activation can block for seconds when another process holds the session
      // or a Bluetooth route is renegotiating, and it too lands before
      // `startedAt`. This is the one window on the arm path that Android cannot
      // reproduce, so it is the prime suspect for the intermittent multi-second
      // mic stall reported on device.
      const endIosSession = diagSpan('mic.iosSession');
      try {
        AudioManager.setAudioSessionOptions({
          iosCategory: 'playAndRecord',
          // swmansion-recommended mode for on-device ASR — tuned for speech.
          // 'measurement' (raw mode) disables iOS input AGC / noise processing
          // for a bone-dry signal — toggleable via the Advanced iOS raw mode
          // setting for A/B testing quiet-capture issues.
          iosMode: this.config.iosRawMode ? 'measurement' : 'spokenAudio',
          // No Bluetooth HFP: a connected headset would route the mic to an
          // ~8 kHz narrowband channel and strip the consonant cues Parakeet
          // needs. Force the full-band built-in mic.
          iosOptions: ['defaultToSpeaker'],
        });
        await AudioManager.setAudioSessionActivity(true);
        endIosSession();
      } catch (sessionErr) {
        endIosSession({ failed: true });
        diagMark('mic.iosSession.failed', {
          message: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
        });
        // Surface the real error from start() below.
      }
    }

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

    const recorder = new AudioRecorder();
    // 1600 samples ≈ 100 ms at 16 kHz: fine enough for the energy gate.
    const ready = recorder.onAudioReady(
      { sampleRate: TARGET_SAMPLE_RATE, bufferLength: 1600, channelCount: 1 },
      event => this.handleBuffer(event),
    );
    if (ready.status === 'error') throw new Error(`onAudioReady failed: ${ready.message}`);
    const started = await recorder.start();
    if (started.status === 'error') throw new Error(`recorder.start failed: ${started.message}`);
    this.recorder = recorder;

    // Safety net: if no buffers arrive (audio session conflict, permission
    // edge case, etc.) the maxDuration check inside handleBuffer never runs
    // and arm() hangs forever. Wall-clock timer enforces the cap with a small
    // margin so a normal handleBuffer-driven stop still wins the race.
    const watchdogDelay = this.config.maxDurationMs + 500;
    this.watchdog = setTimeout(() => {
      if (!this.stopping) {
        const at = Date.now() - this.startedAt;
        diagMark('mic.watchdog', { at, scheduled: watchdogDelay });
        this.stopping = true;
        this.stopReason = 'watchdog';
        this.stopDecidedAt = at;
        this.handlers.onAutoStop?.();
      }
    }, watchdogDelay);
  }

  private handleBuffer(event: AudioReadyEvent): void {
    const channel = event.buffer.getChannelData(0);
    this.sourceSampleRate = event.buffer.sampleRate;
    this.chunks.push(channel.slice());
    this.totalSamples += channel.length;
    this.bufferCount += 1;
    if (this.firstBufferAt === null) {
      this.firstBufferAt = Date.now() - this.startedAt;
      // The number behind "I have to wait for the mic": how long after arm()
      // the microphone actually began delivering audio.
      diagMark('mic.firstBuffer', {
        ms: this.firstBufferAt,
        // If this is not TARGET_SAMPLE_RATE, every buffer pays the JS-side
        // low-pass + decimate in stop() — worth knowing before optimising it.
        sourceSampleRate: this.sourceSampleRate,
        frames: channel.length,
      });
      recordPromptToMic(this.firstBufferAt);
      this.handlers.onCapturing?.();
    }

    let sumSquares = 0;
    for (const sample of channel) {
      sumSquares += sample * sample;
    }
    const rms = channel.length ? Math.sqrt(sumSquares / channel.length) : 0;
    const elapsed = Date.now() - this.startedAt;
    const bufferMs = (event.numFrames / (this.sourceSampleRate || TARGET_SAMPLE_RATE)) * 1000;
    if (rms > this.peakRms) this.peakRms = rms;
    this.handlers.onLevel?.(rms);

    const { state, stop } = stepEnergyGate(
      this.gate,
      { rms, bufferMs, elapsedMs: elapsed },
      this.config,
    );
    this.gate = state;

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

  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder;
    this.recorder = null;
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
    const durationMs = Date.now() - this.startedAt;
    const heardSpeech = this.gate.speechSeen;
    const sourceRate = this.sourceSampleRate;
    const peakRms = this.peakRms;
    const noiseFloor = this.gate.noiseFloor;
    const config = { ...this.config };
    const bufferCount = this.bufferCount;
    const stopReason = this.stopReason;
    const firstBufferMs = this.firstBufferAt;
    const stopDecidedAtMs = this.stopDecidedAt || durationMs;

    if (recorder) {
      recorder.clearOnAudioReady();
      recorder.stop();
      if (Platform.OS === 'ios') {
        try {
          // Restore a playback-friendly session before handing back to
          // expo-audio. start() switches the session to 'spokenAudio' /
          // 'measurement' mode for ASR — a much quieter output level — and iOS
          // keeps applying it, so every prompt after the first recording played
          // quiet. react-native-audio-api only *applies* session options on the
          // next activation, so resetting the mode without re-activating (the
          // previous attempt) was a no-op: expo-audio's setIsAudioActiveAsync
          // just re-activated the stale recording mode. Reset to 'default' mode
          // + speaker route and COMMIT it with an activation so the change
          // actually takes effect before the next prompt plays.
          AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'default',
            iosOptions: ['defaultToSpeaker'],
          });
          await AudioManager.setAudioSessionActivity(true);
        } catch {
          // Non-fatal — playback still works, just potentially at lower volume.
        }
      }
    }

    const merged = concat(this.chunks, this.totalSamples);
    this.chunks = [];
    this.totalSamples = 0;
    const resampled = resample(merged, sourceRate, TARGET_SAMPLE_RATE);
    const { output: waveform } = config.gainNormalizeEnabled
      ? normalizeGain(resampled, config.captureTarget, config.captureMaxGain)
      : { output: resampled };

    return {
      waveform,
      sampleRate: TARGET_SAMPLE_RATE,
      durationMs,
      heardSpeech,
      peakRms,
      noiseFloor,
      bufferCount,
      stopReason,
      firstBufferMs,
      stopDecidedAtMs,
    };
  }

  async cancel(): Promise<void> {
    if (!this.recorder) return;
    this.handlers = {};
    this.stopping = true;
    await this.stop();
  }
}
