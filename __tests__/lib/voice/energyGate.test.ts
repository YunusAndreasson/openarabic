/**
 * Tests for the recording energy gate.
 *
 * The gate has produced two production failures, both with the same signature:
 * a recording that ran to `maxDurationMs` while the learner repeated themselves
 * into a microphone that looked dead. Telemetry from 2026-07-26 caught it again
 * — `stop_reason: 'maxDuration'`, `duration_ms: 15004`, transcript
 * "Approach Approach Approach Approach Approach." — after dropping the forced
 * Bluetooth-HFP route made capture ~3x louder and pushed room tone above
 * `ABS_SILENCE_FLOOR` (0.0018) while staying below `ABS_SPEECH_FLOOR` (0.003).
 * That band is neither speech nor silence, so the gate had no exit.
 */
import {
  DEFAULT_RECORDING_CONFIG,
  initialGateState,
  stepEnergyGate,
  type EnergyGateState,
  type RecordingConfig,
} from '@/lib/voice/recording';

const BUFFER_MS = 100;

/** Feed `count` buffers at a constant level, returning the first stop reason. */
function feed(
  state: EnergyGateState,
  rms: number,
  count: number,
  startMs: number,
  config: RecordingConfig = DEFAULT_RECORDING_CONFIG,
): { state: EnergyGateState; stop: string | null; atMs: number } {
  let current = state;
  let elapsedMs = startMs;
  for (let i = 0; i < count; i += 1) {
    elapsedMs += BUFFER_MS;
    const result = stepEnergyGate(current, { rms, bufferMs: BUFFER_MS, elapsedMs }, config);
    current = result.state;
    if (result.stop) return { state: current, stop: result.stop, atMs: elapsedMs };
  }
  return { state: current, stop: null, atMs: elapsedMs };
}

describe('stepEnergyGate', () => {
  it('stops on silence shortly after a quiet room goes quiet', () => {
    // Speech, then near-silence well under ABS_SILENCE_FLOOR.
    const spoke = feed(initialGateState(), 0.02, 10, 0);
    expect(spoke.stop).toBeNull();
    expect(spoke.state.speechSeen).toBe(true);

    const quiet = feed(spoke.state, 0.0005, 30, spoke.atMs);
    expect(quiet.stop).toBe('silence');
    // 900 ms hang, not the 1350 ms backstop: a quiet room still decides fast.
    expect(quiet.atMs - spoke.atMs).toBe(DEFAULT_RECORDING_CONFIG.silenceHangMs);
  });

  it('stops when room tone sits between the silence and speech thresholds', () => {
    // The regression, reproduced. A constant tone is not enough on its own —
    // the noise floor snaps down to the quietest sample it has seen, so a flat
    // level eventually lands under `noiseFloor * silenceFactor` and counts as
    // silence. The hang needs a *varying* room: one quiet instant pins the floor
    // low, and everything after it sits above ABS_SILENCE_FLOOR (0.0018, so
    // never silence) but below ABS_SPEECH_FLOOR (0.003, so never speech). With
    // only the two thresholds there is no exit from that band.
    const spoke = feed(initialGateState(), 0.04, 10, 0);
    expect(spoke.state.speechSeen).toBe(true);

    const dip = feed(spoke.state, 0.0012, 1, spoke.atMs);
    expect(dip.state.noiseFloor).toBeCloseTo(0.0012, 5);

    const deadBand = feed(dip.state, 0.0025, 60, dip.atMs);
    expect(deadBand.stop).toBe('silence');
    // Released on the idle backstop (first buffer at or past 1350 ms), not the
    // 15 s cap — the whole point. Granularity is one buffer.
    const heldMs = deadBand.atMs - dip.atMs;
    expect(heldMs).toBeGreaterThanOrEqual(DEFAULT_RECORDING_CONFIG.idleHangMs - BUFFER_MS);
    expect(heldMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.idleHangMs + BUFFER_MS);
    // The dip's single quiet buffer is the only silence the gate ever counted;
    // the dead band contributed none. Only the idle backstop got them out.
    expect(deadBand.state.silenceMs).toBe(BUFFER_MS);
  });

  it('never stops mid-utterance while the learner is still speaking', () => {
    let state = initialGateState();
    let elapsedMs = 0;
    // Five repeats of ~600 ms speech separated by 400 ms gaps — shorter than
    // either hang timer, which is exactly why the 15 s cap used to be reached.
    for (let repeat = 0; repeat < 5; repeat += 1) {
      const spoke = feed(state, 0.04, 6, elapsedMs);
      expect(spoke.stop).toBeNull();
      const gap = feed(spoke.state, 0.0024, 4, spoke.atMs);
      expect(gap.stop).toBeNull();
      state = gap.state;
      elapsedMs = gap.atMs;
    }
    // Only once they actually stop does the gate release — and well inside the cap.
    const done = feed(state, 0.0024, 40, elapsedMs);
    expect(done.stop).toBe('silence');
    expect(done.atMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.maxDurationMs);
  });

  it('bails with noSpeech when the mic delivers near-silence throughout', () => {
    // The dead-mic cluster: buffers arrive, peak rms 0.0001, nothing is speech.
    const result = feed(initialGateState(), 0.0001, 100, 0);
    expect(result.stop).toBe('noSpeech');
    expect(result.atMs).toBe(DEFAULT_RECORDING_CONFIG.noSpeechTimeoutMs);
    expect(result.state.speechSeen).toBe(false);
  });

  it('still enforces the max duration for continuous speech', () => {
    const result = feed(initialGateState(), 0.04, 200, 0);
    expect(result.stop).toBe('maxDuration');
    expect(result.atMs).toBe(DEFAULT_RECORDING_CONFIG.maxDurationMs);
  });

  it('honours minDurationMs before any silence stop', () => {
    const spoke = feed(initialGateState(), 0.04, 1, 0);
    const quiet = feed(spoke.state, 0.0005, 30, spoke.atMs);
    expect(quiet.stop).toBe('silence');
    expect(quiet.atMs).toBeGreaterThanOrEqual(DEFAULT_RECORDING_CONFIG.minDurationMs);
  });

  it('treats every buffer as speech when the gate is disabled', () => {
    const config: RecordingConfig = { ...DEFAULT_RECORDING_CONFIG, energyGateEnabled: false };
    const result = feed(initialGateState(), 0.0001, 200, 0, config);
    // No energy gate means no silence detection — only the cap ends it.
    expect(result.stop).toBe('maxDuration');
    expect(result.state.speechSeen).toBe(true);
  });
});
