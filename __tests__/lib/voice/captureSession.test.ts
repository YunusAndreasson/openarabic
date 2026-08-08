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

import { DEFAULT_RECORDING_CONFIG, VoiceCaptureSession } from '@/lib/voice/recording';

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

  test('a window opened before the stream simply captures nothing', async () => {
    const session = new VoiceCaptureSession();
    session.beginWindow({}, DEFAULT_RECORDING_CONFIG);
    const result = session.endWindow();

    expect(result.bufferCount).toBe(0);
    expect(result.waveform.length).toBe(0);
  });
});
