/**
 * Tests for the recording energy gate.
 *
 * The gate has produced three production failures and all three were the same
 * mistake: an ABSOLUTE rms threshold that a change in capture gain moved out
 * from under.
 *
 * 1. 2026-07-26 — dropping the forced Bluetooth-HFP route made capture ~3x
 *    louder and parked room tone between `ABS_SILENCE_FLOOR` (0.0018) and
 *    `ABS_SPEECH_FLOOR` (0.003). That band was neither silence nor speech, so
 *    nothing could end the recording: `stop_reason: 'maxDuration'`,
 *    `duration_ms: 15004`, transcript "Approach Approach Approach Approach".
 * 2. 2026-08-18 — the Advanced "iOS raw mode" toggle went off, swapping the
 *    session mode from `measurement` to `default` and turning AGC on. Capture
 *    got 17 dB louder (speech peak median 0.008 → 0.076) and AGC lifted ROOM
 *    TONE to 0.003–0.006, over the speech floor. The gate then declared speech
 *    on an empty room the moment a window opened and closed it 1.2 s later,
 *    before the learner had said anything: eight rows, `stop_reason: 'silence'`,
 *    `buffer_count: 12–15`, `peak_rms: 0.0035–0.0064`, transcript empty.
 *
 * The current gate has no absolute levels. Every case below is written as a
 * MARGIN over the room, and the two regimes above are run through the same
 * assertions 17 dB apart to prove the gate cannot tell them apart.
 */
import {
  DEFAULT_RECORDING_CONFIG,
  dbfs,
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

/**
 * The two capture regimes seen in the field, as (room tone, speech) pairs.
 *
 * `quiet` is iOS `measurement` mode — no AGC, speech peaking around 0.008 rms.
 * `agc` is iOS `default` mode, the same voice 17 dB hotter with room tone
 * lifted to 0.004. Both hold the invariant the gate reads: speech runs 20–30 dB
 * over the room it was spoken in.
 */
const REGIMES = [
  { name: 'quiet capture (iOS measurement mode)', room: 0.0005, speech: 0.008 },
  { name: 'AGC capture (iOS default mode, 17 dB hotter)', room: 0.004, speech: 0.076 },
] as const;

describe('stepEnergyGate', () => {
  describe.each(REGIMES)('$name', ({ room, speech }) => {
    /** A window as it really opens: room tone first, then the learner. */
    const listening = (ms: number): EnergyGateState =>
      feed(initialGateState(), room, ms / BUFFER_MS, 0).state;

    it('does not mistake room tone for an answer', () => {
      // The 2026-08-18 regression. Six seconds of an empty room must never
      // confirm speech, and must bail as noSpeech rather than closing the
      // window on someone who has not spoken yet.
      const result = feed(initialGateState(), room, 100, 0);
      expect(result.state.speechSeen).toBe(false);
      expect(result.stop).toBe('noSpeech');
      expect(result.atMs).toBe(DEFAULT_RECORDING_CONFIG.noSpeechTimeoutMs);
    });

    it('hears an answer over that room and releases on the silence hang', () => {
      const spoke = feed(listening(700), speech, 5, 700);
      expect(spoke.stop).toBeNull();
      expect(spoke.state.speechSeen).toBe(true);

      const quiet = feed(spoke.state, room, 30, spoke.atMs);
      expect(quiet.stop).toBe('silence');
      expect(quiet.atMs - spoke.atMs).toBe(DEFAULT_RECORDING_CONFIG.silenceHangMs);
    });

    it('measures the room from the room, not from a constant', () => {
      const state = listening(1000);
      expect(state.noiseFloorDb).toBeCloseTo(dbfs(room), 0);
    });
  });

  it('keeps listening when a single loud transient is not an answer', () => {
    // A chair, a door, a breath: one buffer over the threshold used to latch
    // `speechSeen`, after which 900 ms of quiet closed the window on a learner
    // who had not started. `onsetConfirmMs` makes one buffer insufficient.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const blip = feed(room.state, 0.02, 1, room.atMs);
    expect(blip.state.speechSeen).toBe(false);

    const after = feed(blip.state, 0.0005, 12, blip.atMs);
    expect(after.stop).toBeNull();

    // …and the real answer, arriving late, is still heard.
    const spoke = feed(after.state, 0.008, 5, after.atMs);
    expect(spoke.state.speechSeen).toBe(true);
    const quiet = feed(spoke.state, 0.0005, 30, spoke.atMs);
    expect(quiet.stop).toBe('silence');
  });

  it('will not end a window on a transient that clears the onset timer', () => {
    // 200 ms is enough to CONFIRM speech but not enough to end the recording:
    // `minSpeechMs` is the second half of the guard.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const blip = feed(room.state, 0.02, 2, room.atMs);
    expect(blip.state.speechSeen).toBe(true);
    expect(blip.state.speechMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.minSpeechMs);

    const after = feed(blip.state, 0.0005, 20, blip.atMs);
    expect(after.stop).toBeNull();
  });

  it('waits twice as long on a window that barely heard anything', () => {
    // A short burst that scrapes past both onset guards still has to be
    // followed by nearly two seconds of quiet — long enough that a learner who
    // was simply slow to start has spoken and reset the timer.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const brief = feed(room.state, 0.02, 3, room.atMs);
    expect(brief.state.speechSeen).toBe(true);
    expect(brief.state.speechMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.confidentSpeechMs);

    const quiet = feed(brief.state, 0.0005, 30, brief.atMs);
    expect(quiet.stop).toBe('silence');
    expect(quiet.atMs - brief.atMs).toBe(DEFAULT_RECORDING_CONFIG.silenceHangMs * 2);

    // A real answer is not made to wait: past confidentSpeechMs the hang is the
    // normal one.
    const spoke = feed(room.state, 0.02, 6, room.atMs);
    expect(spoke.state.speechMs).toBeGreaterThanOrEqual(DEFAULT_RECORDING_CONFIG.confidentSpeechMs);
    const after = feed(spoke.state, 0.0005, 30, spoke.atMs);
    expect(after.atMs - spoke.atMs).toBe(DEFAULT_RECORDING_CONFIG.silenceHangMs);
  });

  it('releases on the idle backstop when the room rises into the hysteresis band', () => {
    // The 2026-07-26 regression. Room tone climbs after the answer to a level
    // that is over the release threshold but under the onset threshold —
    // neither silence nor speech. `silenceMs` cannot accumulate there, so only
    // `idleHangMs` can end the window.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const spoke = feed(room.state, 0.02, 6, room.atMs);
    expect(spoke.state.speechSeen).toBe(true);

    const floorDb = spoke.state.noiseFloorDb;
    const band = Math.pow(
      10,
      (floorDb +
        (DEFAULT_RECORDING_CONFIG.releaseMarginDb + DEFAULT_RECORDING_CONFIG.onsetMarginDb) / 2) /
        20,
    );
    const deadBand = feed(spoke.state, band, 60, spoke.atMs);
    expect(deadBand.stop).toBe('silence');
    const heldMs = deadBand.atMs - spoke.atMs;
    expect(heldMs).toBeGreaterThanOrEqual(DEFAULT_RECORDING_CONFIG.idleHangMs - BUFFER_MS);
    expect(heldMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.idleHangMs + BUFFER_MS);
    // The band never accumulated a silence hang — bar the one transitional
    // buffer before the floor caught up with the risen room. The backstop is
    // what got the window out.
    expect(deadBand.state.silenceMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.silenceHangMs);
  });

  it('absorbs steady noise that starts mid-window instead of running to the cap', () => {
    // A fan, a passing car: noise that begins AFTER the window opened is over
    // the onset threshold at first, so it reads as speech. The trailing-minimum
    // floor rises to meet it and the window still closes well inside the cap —
    // where a floor that only fell would have held it open for 15 s.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const spoke = feed(room.state, 0.02, 6, room.atMs);
    const noisy = feed(spoke.state, 0.004, 140, spoke.atMs);
    expect(noisy.stop).toBe('silence');
    expect(noisy.atMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.maxDurationMs);
  });

  it('never stops mid-utterance while the learner is still speaking', () => {
    let state = feed(initialGateState(), 0.0005, 5, 0).state;
    let elapsedMs = 500;
    // Five repeats of ~600 ms speech separated by 400 ms gaps — shorter than
    // either hang timer, which is exactly why the 15 s cap used to be reached.
    for (let repeat = 0; repeat < 5; repeat += 1) {
      const spoke = feed(state, 0.02, 6, elapsedMs);
      expect(spoke.stop).toBeNull();
      const gap = feed(spoke.state, 0.0005, 4, spoke.atMs);
      expect(gap.stop).toBeNull();
      state = gap.state;
      elapsedMs = gap.atMs;
    }
    const done = feed(state, 0.0005, 40, elapsedMs);
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

  it('still enforces the max duration for someone who keeps talking', () => {
    // Speech in bursts with gaps too short for either hang timer — the shape
    // that reaches the cap honestly.
    let state = feed(initialGateState(), 0.0005, 5, 0).state;
    let elapsedMs = 500;
    let stop: string | null = null;
    while (elapsedMs < DEFAULT_RECORDING_CONFIG.maxDurationMs && !stop) {
      const spoke = feed(state, 0.02, 6, elapsedMs);
      stop = spoke.stop;
      elapsedMs = spoke.atMs;
      if (stop) break;
      const gap = feed(spoke.state, 0.0005, 4, elapsedMs);
      stop = gap.stop;
      state = gap.state;
      elapsedMs = gap.atMs;
    }
    expect(stop).toBe('maxDuration');
    expect(elapsedMs).toBe(DEFAULT_RECORDING_CONFIG.maxDurationMs);
  });

  it('absorbs an unbroken constant tone rather than holding the window open', () => {
    // The deliberate limit of a trailing-minimum floor: audio that never varies
    // for longer than the noise window IS the room, by definition, and the gate
    // lets go of it. Nothing a learner says is 5 s of unbroken constant level —
    // and the alternative is what this replaced, a window pinned to the 15 s cap
    // by a fan.
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const held = feed(room.state, 0.02, 200, room.atMs);
    expect(held.stop).toBe('silence');
    expect(held.atMs).toBeLessThan(DEFAULT_RECORDING_CONFIG.maxDurationMs);
  });

  it('honours minDurationMs before any silence stop', () => {
    const room = feed(initialGateState(), 0.0005, 5, 0);
    const spoke = feed(room.state, 0.02, 3, room.atMs);
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

  it('a room that wanders does not hold the window open', () => {
    // Room tone is never one level — it moves several dB buffer to buffer. The
    // gate reads the floor at a percentile rather than the quietest instant for
    // exactly this: against a strict minimum, the room's own peaks clear the
    // onset threshold, every crossing resets the hang timers, and the recording
    // runs until the learner has repeated themselves into the 15 s cap. Swept
    // here to 16 dB peak-to-peak, well past any real room.
    let seed = 7;
    const rand = (): number => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 1) / 0x7fffffff;
    const wander = (level: number, spread: number): number =>
      level * Math.pow(10, ((rand() - 0.5) * spread) / 20);

    for (const spread of [4, 8, 12, 16]) {
      const room = 0.0045;
      let state = initialGateState();
      let elapsedMs = 0;
      let stop: string | null = null;
      const step = (rms: number): void => {
        elapsedMs += BUFFER_MS;
        const result = stepEnergyGate(
          state,
          { rms, bufferMs: BUFFER_MS, elapsedMs },
          DEFAULT_RECORDING_CONFIG,
        );
        state = result.state;
        stop = stop ?? result.stop;
      };
      for (let i = 0; i < 15; i += 1) step(wander(room, spread));
      expect(stop).toBeNull();
      expect(state.speechSeen).toBe(false); // the room is not an answer
      for (let i = 0; i < 6; i += 1) step(0.06);
      for (let i = 0; i < 60 && !stop; i += 1) step(wander(room, spread));
      expect(stop).toBe('silence');
      expect(elapsedMs).toBeLessThan(5000);
    }
  });

  describe('seeding from the previous card', () => {
    it('hears an answer that starts on the first buffer', () => {
      // Cold, the first buffers ARE the floor, so an instant answer measures
      // itself against itself and cannot clear its own onset threshold.
      const cold = feed(initialGateState(), 0.008, 5, 0);
      expect(cold.state.speechSeen).toBe(false);

      // Seeded with the room the previous card measured, the same audio is an
      // answer from the first buffer. Cards are seconds apart in one room, and
      // the capture session carries this across every card it records.
      const room = feed(initialGateState(), 0.0005, 20, 0).state;
      const warm = feed(initialGateState(room), 0.008, 5, 0);
      expect(warm.state.speechSeen).toBe(true);
    });
  });
});
