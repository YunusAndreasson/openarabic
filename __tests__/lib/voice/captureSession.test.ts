/**
 * Tests for the session-scoped microphone.
 *
 * The recorder used to be built and destroyed per card, and that is where the
 * feature's whole reliability history came from: ~500 ms before the first
 * buffer arrived, a teardown the next card had to await before it could start,
 * and a stream that failed to open leaving the learner with a microphone that
 * never worked. The stream is now opened once per review session and only
 * paused between cards, so what these tests actually protect is the property
 * that makes that safe — a card's audio is exactly the audio that arrived while
 * its window was open, and nothing else.
 */
import { describe, expect, jest, beforeEach, test } from '@jest/globals';

import {
  __resetMicPermissionForTests,
  DEFAULT_RECORDING_CONFIG,
  ensureMicPermission,
  forgetMicPermissionRefusal,
  getMicPermissionStatus,
  VoiceCaptureSession,
  type SpeechGate,
} from '@/lib/voice/recording';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('react-native-audio-api');

/** A level comfortably above ABS_SPEECH_FLOOR (0.003). */
const SPEECH = 0.05;
/** A level comfortably below ABS_SILENCE_FLOOR (0.0018). */
const SILENCE = 0.0001;

function recorder() {
  return __mocks.lastRecorder();
}

describe('VoiceCaptureSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMicPermissionForTests();
    __mocks.resetRecorders();
    // clearAllMocks wipes the default resolutions on the shared AudioManager
    // mock, and an unresolved permission check reads as a denial.
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Granted');
    __mocks.AudioManager.requestRecordingPermissions.mockResolvedValue('Granted');
    __mocks.AudioManager.setAudioSessionActivity.mockResolvedValue(undefined);
  });

  test('opens exactly one native recorder for the whole session', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    for (let card = 0; card < 3; card += 1) {
      session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
      recorder().emitBuffer({ level: SPEECH });
      session.endWindow();
    }

    expect(__mocks.recorderCount()).toBe(1);
    expect(recorder().startCalls).toBe(1);
    expect(recorder().resumeCalls).toBe(3);
  });

  test('concurrent open() calls share one attempt', async () => {
    const session = new VoiceCaptureSession();
    await Promise.all([
      session.open(DEFAULT_RECORDING_CONFIG),
      session.open(DEFAULT_RECORDING_CONFIG),
    ]);

    expect(__mocks.recorderCount()).toBe(1);
  });

  test('concurrent permission callers share one system prompt', async () => {
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Undetermined');
    let answer: (value: string) => void = () => {};
    __mocks.AudioManager.requestRecordingPermissions.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );

    const prewarm = ensureMicPermission();
    const captureOpen = ensureMicPermission();
    await Promise.resolve();

    expect(__mocks.AudioManager.requestRecordingPermissions).toHaveBeenCalledTimes(1);
    answer('Denied');
    await expect(Promise.all([prewarm, captureOpen])).resolves.toEqual([false, false]);
    expect(__mocks.AudioManager.requestRecordingPermissions).toHaveBeenCalledTimes(1);
  });

  test('a denied permission decision is not requested again in the same process', async () => {
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Undetermined');
    __mocks.AudioManager.requestRecordingPermissions.mockResolvedValue('Denied');

    await expect(ensureMicPermission()).resolves.toBe(false);
    await expect(ensureMicPermission()).resolves.toBe(false);

    expect(__mocks.AudioManager.checkRecordingPermissions).toHaveBeenCalledTimes(1);
    expect(__mocks.AudioManager.requestRecordingPermissions).toHaveBeenCalledTimes(1);
  });

  test('a refusal is re-read after a trip to Settings, where Android can grant it live', async () => {
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Undetermined');
    __mocks.AudioManager.requestRecordingPermissions.mockResolvedValue('Denied');
    await expect(ensureMicPermission()).resolves.toBe(false);
    await expect(getMicPermissionStatus()).resolves.toBe('denied');

    // "Enable microphone" → Settings → Allow. Android keeps the process alive.
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Granted');
    forgetMicPermissionRefusal();

    await expect(getMicPermissionStatus()).resolves.toBe('granted');
    await expect(ensureMicPermission()).resolves.toBe(true);
    expect(__mocks.AudioManager.requestRecordingPermissions).toHaveBeenCalledTimes(1);
  });

  test('forgetting a refusal leaves a cached grant alone', async () => {
    await expect(ensureMicPermission()).resolves.toBe(true);
    forgetMicPermissionRefusal();
    await expect(ensureMicPermission()).resolves.toBe(true);

    expect(__mocks.AudioManager.checkRecordingPermissions).toHaveBeenCalledTimes(1);
  });

  test('idles the stream until a card asks for it', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    expect(session.isOpen).toBe(true);
    expect(session.isCapturing).toBe(false);
    expect(recorder().pauseCalls).toBe(1);
  });

  test('discards audio that arrives between cards', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    // The stream may still be live between windows — pause() is best-effort and
    // platform-dependent, so correctness cannot depend on it having landed.
    recorder().emitBuffer({ level: SPEECH });
    recorder().emitBuffer({ level: SPEECH });

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    recorder().emitBuffer({ level: SPEECH });
    const result = session.endWindow();

    expect(result.bufferCount).toBe(1);
  });

  test('a card only ever sees its own audio', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    recorder().emitBuffer({ level: SPEECH });
    recorder().emitBuffer({ level: SPEECH });
    const first = session.endWindow();

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    recorder().emitBuffer({ level: SPEECH });
    const second = session.endWindow();

    expect(first.bufferCount).toBe(2);
    expect(second.bufferCount).toBe(1);
    expect(second.waveform.length).toBeLessThan(first.waveform.length);
  });

  test('reports the first buffer and fires onCapturing once per window', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    const onCapturing = jest.fn();
    session.beginWindow({ onCapturing }, DEFAULT_RECORDING_CONFIG);
    recorder().emitBuffer({ level: SPEECH });
    recorder().emitBuffer({ level: SPEECH });
    const result = session.endWindow();

    expect(onCapturing).toHaveBeenCalledTimes(1);
    expect(result.firstBufferMs).not.toBeNull();
  });

  test('the energy gate still ends the window and reports why', async () => {
    // The gate measures elapsed time off the wall clock, so the buffers have to
    // arrive 100 ms apart the way real ones do — otherwise nothing ever gets
    // past minDurationMs.
    jest.useFakeTimers();
    try {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);

      const onAutoStop = jest.fn();
      session.beginWindow({ onAutoStop }, DEFAULT_RECORDING_CONFIG);

      const feed = (level: number, count: number) => {
        for (let i = 0; i < count; i += 1) {
          jest.advanceTimersByTime(100);
          recorder().emitBuffer({ level });
        }
      };

      // Room tone first, because that is how a window really opens — the
      // recorder resumes while the learner is still reacting to the prompt.
      // The gate measures the room from those buffers; handed nothing but
      // speech from the first one it has no room to measure the speech against.
      feed(SILENCE, 4);
      // Speech past minDurationMs (600 ms)…
      feed(SPEECH, 8);
      expect(onAutoStop).not.toHaveBeenCalled();
      // …then silence past silenceHangMs (900 ms).
      feed(SILENCE, 12);

      expect(onAutoStop).toHaveBeenCalled();
      const result = session.endWindow();
      expect(result.stopReason).toBe('silence');
      expect(result.heardSpeech).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('trims the trailing silence the gate waited out', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    // 4 buffers of speech bracketed by 10 of silence either side. Only the
    // speech (plus a short pre/post roll) should reach the recogniser: an
    // offline transducer's decode time scales with what it is handed, and every
    // sample is converted through Array.from on the JS thread first.
    for (let i = 0; i < 10; i += 1) recorder().emitBuffer({ level: SILENCE });
    for (let i = 0; i < 4; i += 1) recorder().emitBuffer({ level: SPEECH });
    for (let i = 0; i < 10; i += 1) recorder().emitBuffer({ level: SILENCE });
    const result = session.endWindow();

    const capturedSamples = 24 * 1600;
    expect(result.bufferCount).toBe(24);
    expect(result.waveform.length).toBeLessThan(capturedSamples);
    // The speech itself is never clipped.
    expect(result.waveform.length).toBeGreaterThanOrEqual(4 * 1600);
  });

  test('carries the room it measured into the next card', async () => {
    // A window that opens onto an answer already in progress has nothing to
    // measure the answer against — the first buffers ARE the floor. Cards are
    // seconds apart in one room, so the previous window's measurement is the
    // best estimate the new one can start from, and it is what makes an instant
    // answer gradeable.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 20; i += 1) recorder().emitBuffer({ level: SILENCE });
    const quietRoom = session.endWindow();
    expect(quietRoom.heardSpeech).toBe(false);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 5; i += 1) recorder().emitBuffer({ level: SPEECH });
    const answered = session.endWindow();
    expect(answered.heardSpeech).toBe(true);
    expect(answered.speechMs).toBeGreaterThan(0);
  });

  test('does not carry a room measured on the learner instead of the room', async () => {
    // The seed is what makes an instant answer gradeable, but only while it is a
    // measurement of the ROOM. The floor is the 20th percentile of a 5 s trailing
    // window, so a window whose tail is nearly all voice reports a floor at
    // SPEECH level. Seeding the next card with that puts its onset threshold
    // `onsetMarginDb` ABOVE the learner's own voice — a card that cannot hear
    // them, which then records only speech and re-seeds the same high floor.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    // Card 1: a quiet room, then an answer long enough to fill the 5 s trailing
    // window (50 buffers at 100 ms), so the window ENDS with its floor sitting
    // on the learner's voice rather than on the room.
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 5; i += 1) recorder().emitBuffer({ level: SILENCE });
    for (let i = 0; i < 60; i += 1) recorder().emitBuffer({ level: SPEECH });
    const longAnswer = session.endWindow();
    expect(longAnswer.heardSpeech).toBe(true);
    // The premise of the test: this window's own floor really did climb onto
    // the voice. Without that there is nothing here to carry wrongly.
    expect(longAnswer.noiseFloorDb as number).toBeGreaterThan(-40);

    // Card 2: the same voice, at the same level, must still be heard.
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SILENCE });
    for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SPEECH });
    const next = session.endWindow();

    expect(next.heardSpeech).toBe(true);
    expect(next.speechMs).toBeGreaterThan(0);
  });

  test('close() drops the room with the stream that measured it', async () => {
    // Every caller of close() is a rebuild — an interruption, a route change —
    // and a rebuild is when the capture gain can move. The corpus has two
    // regimes 17 dB apart, so a floor measured before a headset arrived is not a
    // floor after it: carrying it across is the absolute-threshold failure this
    // file was rewritten to remove, arriving through state instead of a constant.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    // Measure a LOUD room, so a carried estimate would be unmistakable.
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 20; i += 1) recorder().emitBuffer({ level: 0.02 });
    const loud = session.endWindow();
    expect(loud.noiseFloorDb).not.toBeNull();

    await session.close();
    await session.open(DEFAULT_RECORDING_CONFIG);

    // One buffer of a much quieter room: with the old estimate carried, the
    // reported floor would still be the loud one.
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    recorder().emitBuffer({ level: SILENCE });
    const afterReopen = session.endWindow();

    expect(afterReopen.noiseFloorDb).not.toBeNull();
    expect(afterReopen.noiseFloorDb as number).toBeLessThan(loud.noiseFloorDb as number);
  });

  test('a window that received no audio reports no room, rather than a quiet one', async () => {
    // The dead-mic row (session conflict, permission edge, a stream that died)
    // used to write the SEED value, so it read as a genuinely quiet room in both
    // the HUD and `voice_grading_attempts` — the one row an investigation most
    // needs to tell apart from a measurement.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    const dead = session.endWindow();

    expect(dead.bufferCount).toBe(0);
    expect(dead.noiseFloorDb).toBeNull();
    expect(dead.firstBufferMs).toBeNull();
  });

  test('the envelope keeps the most recent buffers, where the stop is decided', async () => {
    // Head-truncation cut the envelope off exactly before the moment it exists
    // to explain: every stop except `noSpeech` is decided in the tail. Only bites
    // on a device delivering small buffers, which is when it matters most.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    // 800 short buffers, well past the 320 cap: quiet first, loud last. The cap
    // is 320 rather than 160 because a hands-free window runs to 30 s, twice the
    // tapped one — at 160 the first half of every self-opened window's envelope,
    // onset included, would have been dropped.
    for (let i = 0; i < 400; i += 1) recorder().emitBuffer({ level: SILENCE, frames: 160 });
    for (let i = 0; i < 400; i += 1) recorder().emitBuffer({ level: SPEECH, frames: 160 });
    const result = session.endWindow();

    expect(result.levelsDb).toHaveLength(320);
    // Every kept entry is from the loud tail, not the quiet head.
    const quietest = Math.max(...result.levelsDb);
    expect(quietest).toBeLessThan(0);
    expect(Math.min(...result.levelsDb)).toBeGreaterThan(-40);
  });

  test('reports the envelope and the room it decided against', async () => {
    // `peak_rms` is one number for a whole window, and it is why all three gate
    // regressions needed a live device session to diagnose. The envelope shows
    // WHERE the energy was; the floor shows what it was judged against.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SILENCE });
    for (let i = 0; i < 4; i += 1) recorder().emitBuffer({ level: SPEECH });
    const result = session.endWindow();

    expect(result.levelsDb).toHaveLength(10);
    expect(result.levelsDb.every(Number.isInteger)).toBe(true);
    // Quiet buffers first, louder ones after — the shape of a real answer.
    expect(Math.max(...result.levelsDb.slice(0, 6))).toBeLessThan(
      Math.min(...result.levelsDb.slice(6)),
    );
    expect(result.noiseFloorDb).toBeLessThan(0);
  });

  test('keeps a silent recording whole so it can be judged as silence', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);

    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    for (let i = 0; i < 5; i += 1) recorder().emitBuffer({ level: SILENCE });
    const result = session.endWindow();

    expect(result.heardSpeech).toBe(false);
    expect(result.waveform.length).toBe(5 * 1600);
  });

  test('surfaces a stream error instead of failing silently', async () => {
    const session = new VoiceCaptureSession();
    const onError = jest.fn();
    session.onStreamError(onError);
    await session.open(DEFAULT_RECORDING_CONFIG);

    recorder().emitError('input node disconnected');

    expect(onError).toHaveBeenCalledWith('input node disconnected');
  });

  test('close() releases the stream and its callbacks', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);
    const native = recorder();

    await session.close();

    expect(native.stopCalls).toBe(1);
    expect(session.isOpen).toBe(false);
    expect(native._callback).toBeNull();
    expect(native._errorCallback).toBeNull();
  });

  test('close() stops the engine before detaching the buffer tap', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);
    const native = recorder();

    await session.close();

    expect(native.callbackAttachedAtStop).toBe(true);
  });

  // A reopen after an interruption has to make the OS rebuild the audio engine.
  // Re-activating a session iOS already considers active is a no-op, which is
  // how a call left `recorder.start()` failing with "Failed to start audio
  // engine for recording" for the rest of a real session — while the session
  // reported active with the built-in microphone in the route.
  test('close({ releaseSession: true }) deactivates the audio session', async () => {
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);
    __mocks.AudioManager.setAudioSessionActivity.mockClear();

    await session.close({ releaseSession: true });

    expect(__mocks.AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(false);
  });

  test('a plain close() leaves the audio session alone', async () => {
    // The playback lane shares this session: an unmount or a voice-off toggle
    // must not deactivate a session the review prompt may still be using.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);
    __mocks.AudioManager.setAudioSessionActivity.mockClear();

    await session.close();

    expect(__mocks.AudioManager.setAudioSessionActivity).not.toHaveBeenCalled();
  });

  test('a refused deactivation does not stop the stream being released', async () => {
    // iOS refuses to deactivate whenever anything else still holds the session.
    // The reopen re-activates regardless, so this must not throw.
    const session = new VoiceCaptureSession();
    await session.open(DEFAULT_RECORDING_CONFIG);
    __mocks.AudioManager.setAudioSessionActivity.mockRejectedValueOnce(new Error('session busy'));

    await expect(session.close({ releaseSession: true })).resolves.toBeUndefined();
    expect(session.isOpen).toBe(false);
  });

  describe('the speech gate', () => {
    /**
     * A stand-in for the FSMN VAD. It reports what the recorder did to it, and
     * `speaking` is flipped by the test rather than by a model — which is the
     * whole reason the recorder takes an interface here and not a module.
     */
    function stubGate(overrides: Partial<SpeechGate> = {}) {
      const inserted: Float32Array[] = [];
      let handlers: { onSpeechBegin: () => void; onSpeechEnd: () => void } | null = null;
      const gate: SpeechGate & {
        inserted: Float32Array[];
        speak: () => void;
        hush: () => void;
        stopped: number;
      } = {
        isReady: true,
        inserted,
        stopped: 0,
        start: h => {
          handlers = h;
        },
        insert: waveform => {
          inserted.push(waveform);
        },
        stop: () => {
          gate.stopped += 1;
        },
        speak: () => handlers?.onSpeechBegin(),
        hush: () => handlers?.onSpeechEnd(),
        ...overrides,
      };
      return gate;
    }

    test('drives the window from the VAD and says so in the result', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate();

      session.beginWindow({}, DEFAULT_RECORDING_CONFIG, gate);
      // Loud audio the VAD has not called speech: under the energy gate this is
      // an answer, and the whole point of the VAD is that it is not.
      for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SPEECH });
      expect(session.endWindow()).toMatchObject({ gateUsed: 'vad', heardSpeech: false });
      expect(gate.inserted).toHaveLength(6);
      expect(gate.stopped).toBe(1);
    });

    test('hears an answer the moment the VAD calls one', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate();

      session.beginWindow({}, DEFAULT_RECORDING_CONFIG, gate);
      gate.speak();
      // Quiet enough that the dB gate would never have confirmed it.
      for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SILENCE });
      expect(session.endWindow()).toMatchObject({ gateUsed: 'vad', heardSpeech: true });
    });

    test('falls back to the energy gate when the VAD session dies mid-answer', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      let alive = true;
      const gate = stubGate({
        insert: () => {
          if (!alive) throw new Error('VAD stream failed');
        },
      });

      session.beginWindow({}, DEFAULT_RECORDING_CONFIG, gate);
      recorder().emitBuffer({ level: SILENCE });
      alive = false;
      // Stranding the learner over a detector that is not the point of the
      // exercise is the one outcome this must never produce: the window carries
      // on, and the result reports which gate actually finished it.
      for (let i = 0; i < 6; i += 1) recorder().emitBuffer({ level: SPEECH });
      expect(session.endWindow()).toMatchObject({ gateUsed: 'energy', heardSpeech: true });
    });

    test('hands the window back when the capture rate is not the model rate', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate();

      session.beginWindow({}, DEFAULT_RECORDING_CONFIG, gate);
      // FSMN is a 16 kHz model and the resample only happens at endWindow, far
      // too late to feed a live detector.
      recorder().emitBuffer({ level: SPEECH, sampleRate: 44100 });
      expect(session.endWindow().gateUsed).toBe('energy');
      expect(gate.inserted).toHaveLength(0);
    });

    test('runs on the energy gate while the model is still downloading', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate({ isReady: false });

      session.beginWindow({}, DEFAULT_RECORDING_CONFIG, gate);
      recorder().emitBuffer({ level: SPEECH });
      expect(session.endWindow().gateUsed).toBe('energy');
      expect(gate.inserted).toHaveLength(0);
    });

    test('never starts the VAD while auto-stop is switched off', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate();

      // Advanced → "Auto-stop on silence" off means the VAD's verdict is
      // discarded, so running the model would be a native inference every
      // 100 ms for a 30 s window to compute a number nothing reads — and would
      // then report `gateUsed: 'vad'` for a window the dB gate decided, which
      // is the one thing that field promises never to do.
      session.beginWindow({}, { ...DEFAULT_RECORDING_CONFIG, energyGateEnabled: false }, gate);
      for (let i = 0; i < 4; i += 1) recorder().emitBuffer({ level: SPEECH });

      expect(session.endWindow().gateUsed).toBe('energy');
      expect(gate.inserted).toHaveLength(0);
    });

    test('honours a config that asks for the energy gate outright', async () => {
      const session = new VoiceCaptureSession();
      await session.open(DEFAULT_RECORDING_CONFIG);
      const gate = stubGate();

      session.beginWindow({}, { ...DEFAULT_RECORDING_CONFIG, speechGate: 'energy' }, gate);
      recorder().emitBuffer({ level: SPEECH });
      expect(session.endWindow().gateUsed).toBe('energy');
      expect(gate.inserted).toHaveLength(0);
    });
  });

  test('a window opened before the stream simply captures nothing', async () => {
    const session = new VoiceCaptureSession();
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    const result = session.endWindow();

    expect(result.bufferCount).toBe(0);
    expect(result.waveform.length).toBe(0);
  });
});
