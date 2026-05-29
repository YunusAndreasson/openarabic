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

interface AudioReadyEvent {
  buffer: AudioBuffer;
  numFrames: number;
  when: number;
}

/** Parakeet expects 16 kHz mono. */
export const TARGET_SAMPLE_RATE = 16000;

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
  gainNormalizeEnabled: boolean;
  captureTarget: number;
  captureMaxGain: number;
}

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  energyGateEnabled: true,
  speechFactor: 1.5,
  silenceFactor: 1.2,
  noiseRiseRate: 0.01,
  silenceHangMs: 900,
  minDurationMs: 600,
  maxDurationMs: 10000,
  gainNormalizeEnabled: true,
  captureTarget: 0.7,
  captureMaxGain: 60,
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
  /** What stopped the recording: 'silence' (energy gate), 'maxDuration'
   *  (hit cap inside handleBuffer), 'watchdog' (cap fired with zero buffers),
   *  or 'manual' (cancel / external stop). */
  stopReason: 'silence' | 'maxDuration' | 'watchdog' | 'manual';
}

export interface RecordingHandlers {
  onAutoStop?: () => void;
}

export class MicPermissionDeniedError extends Error {
  constructor() {
    super('Microphone permission denied');
    this.name = 'MicPermissionDeniedError';
  }
}

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
    const sinc =
      x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
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

export function resample(input: Float32Array, from: number, to: number): Float32Array {
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
export function normalizeGain(
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
  private speechSeen = false;
  private silenceMs = 0;
  private peakRms = 0;
  private noiseFloor = INITIAL_NOISE_FLOOR;
  private stopping = false;
  private handlers: RecordingHandlers = {};
  private config: RecordingConfig = { ...DEFAULT_RECORDING_CONFIG };
  private bufferCount = 0;
  private stopReason: RecordingResult['stopReason'] = 'manual';
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  get isRecording(): boolean {
    return this.recorder !== null;
  }

  async start(handlers: RecordingHandlers = {}, config?: RecordingConfig): Promise<void> {
    if (this.recorder) return;
    const allowed = await ensureMicPermission();
    if (!allowed) throw new MicPermissionDeniedError();

    this.config = config ?? { ...DEFAULT_RECORDING_CONFIG };

    if (Platform.OS === 'ios') {
      try {
        AudioManager.setAudioSessionOptions({
          iosCategory: 'playAndRecord',
          // swmansion-recommended mode for on-device ASR — tuned for speech.
          iosMode: 'spokenAudio',
          // No Bluetooth HFP: a connected headset would route the mic to an
          // ~8 kHz narrowband channel and strip the consonant cues Parakeet
          // needs. Force the full-band built-in mic.
          iosOptions: ['defaultToSpeaker'],
        });
        await AudioManager.setAudioSessionActivity(true);
      } catch {
        // Surface the real error from start() below.
      }
    }

    this.chunks = [];
    this.totalSamples = 0;
    this.sourceSampleRate = TARGET_SAMPLE_RATE;
    this.speechSeen = false;
    this.silenceMs = 0;
    this.peakRms = 0;
    this.noiseFloor = INITIAL_NOISE_FLOOR;
    this.stopping = false;
    this.handlers = handlers;
    this.startedAt = Date.now();
    this.bufferCount = 0;
    this.stopReason = 'manual';

    const recorder = new AudioRecorder();
    // 1600 samples ≈ 100 ms at 16 kHz: fine enough for the energy gate.
    const ready = recorder.onAudioReady(
      { sampleRate: TARGET_SAMPLE_RATE, bufferLength: 1600, channelCount: 1 },
      event => this.handleBuffer(event),
    );
    if (ready.status === 'error') throw new Error(`onAudioReady failed: ${ready.message}`);
    const started = recorder.start();
    if (started.status === 'error') throw new Error(`recorder.start failed: ${started.message}`);
    this.recorder = recorder;

    // Safety net: if no buffers arrive (audio session conflict, permission
    // edge case, etc.) the maxDuration check inside handleBuffer never runs
    // and arm() hangs forever. Wall-clock timer enforces the cap with a small
    // margin so a normal handleBuffer-driven stop still wins the race.
    this.watchdog = setTimeout(() => {
      if (!this.stopping) {
        this.stopping = true;
        this.stopReason = 'watchdog';
        this.handlers.onAutoStop?.();
      }
    }, this.config.maxDurationMs + 500);
  }

  private handleBuffer(event: AudioReadyEvent): void {
    const channel = event.buffer.getChannelData(0);
    this.sourceSampleRate = event.buffer.sampleRate;
    this.chunks.push(channel.slice());
    this.totalSamples += channel.length;
    this.bufferCount += 1;

    let sumSquares = 0;
    for (const sample of channel) {
      sumSquares += sample * sample;
    }
    const rms = channel.length ? Math.sqrt(sumSquares / channel.length) : 0;
    const elapsed = Date.now() - this.startedAt;
    const bufferMs = (event.numFrames / (this.sourceSampleRate || TARGET_SAMPLE_RATE)) * 1000;
    if (rms > this.peakRms) this.peakRms = rms;

    const speechThreshold = this.config.energyGateEnabled
      ? Math.max(ABS_SPEECH_FLOOR, this.noiseFloor * this.config.speechFactor)
      : 0;
    const silenceThreshold = this.config.energyGateEnabled
      ? Math.max(ABS_SILENCE_FLOOR, this.noiseFloor * this.config.silenceFactor)
      : Infinity;

    if (rms < this.noiseFloor) this.noiseFloor = rms;
    else if (this.config.energyGateEnabled && rms < speechThreshold)
      this.noiseFloor += (rms - this.noiseFloor) * this.config.noiseRiseRate;

    if (!this.config.energyGateEnabled || rms >= speechThreshold) {
      this.speechSeen = true;
      this.silenceMs = 0;
    } else if (this.speechSeen && rms < silenceThreshold) {
      this.silenceMs += bufferMs;
    }

    const quietEnough =
      this.speechSeen &&
      this.silenceMs >= this.config.silenceHangMs &&
      elapsed >= this.config.minDurationMs;
    if (!this.stopping && (quietEnough || elapsed >= this.config.maxDurationMs)) {
      this.stopping = true;
      this.stopReason = quietEnough ? 'silence' : 'maxDuration';
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
    const heardSpeech = this.speechSeen;
    const sourceRate = this.sourceSampleRate;
    const peakRms = this.peakRms;
    const noiseFloor = this.noiseFloor;
    const config = { ...this.config };
    const bufferCount = this.bufferCount;
    const stopReason = this.stopReason;

    if (recorder) {
      recorder.clearOnAudioReady();
      recorder.stop();
      if (Platform.OS === 'ios') {
        try {
          await AudioManager.setAudioSessionActivity(false);
        } catch {
          // Non-fatal.
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
    };
  }

  async cancel(): Promise<void> {
    if (!this.recorder) return;
    this.handlers = {};
    this.stopping = true;
    await this.stop();
  }
}
