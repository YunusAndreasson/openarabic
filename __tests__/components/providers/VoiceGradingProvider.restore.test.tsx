import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AudioManager } from 'react-native-audio-api';

import {
  VoiceGradingProvider,
  meterLevel,
  useVoiceGrading,
} from '@/components/providers/VoiceGradingProvider';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { MicPermissionDeniedError, VoiceCaptureSession } from '@/lib/voice/recording';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppSelectorShallow } from '@/store/hooks';
import type { RootState } from '@/store/store';

jest.mock('@/hooks/voice/useSherpaStt', () => ({ useParakeetStt: jest.fn() }));
jest.mock('@/hooks/voice/useVoiceModel', () => ({ useVoiceModel: jest.fn() }));
jest.mock('@/hooks/voice/useVoiceModelPrefetch', () => ({ useVoiceModelPrefetch: jest.fn() }));
jest.mock('@/hooks/app/useResumeFromBackground', () => ({ useResumeFromBackground: jest.fn() }));
jest.mock('@/store/hooks', () => ({ useAppSelectorShallow: jest.fn() }));
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: { setRecordingSessionEnabled: jest.fn() },
}));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/utils/errorHandling', () => ({ voiceBreadcrumb: jest.fn() }));
jest.mock('@/utils/reviewDiagnostics', () => ({ mark: jest.fn(), span: () => () => undefined }));
jest.mock('@/lib/voice/recording', () => ({
  DEFAULT_RECORDING_CONFIG: {},
  MicPermissionDeniedError: class extends Error {},
  VoiceCaptureSession: jest.fn(),
  ensureMicPermission: jest.fn(),
}));

let streamOpen: boolean;
let recordingOwned: boolean;
let inputConfigurationReady: boolean;
let resetBarrier: Promise<void> | null;
let resetStarted: (() => void) | null;
let releaseStarted: (() => void) | null;
let events: string[];
let failNextOpen: boolean;
let closeBarrier: Promise<void> | null;
let capture: {
  isOpen: boolean;
  isCapturing: boolean;
  open: jest.Mock;
  close: jest.Mock;
  cancelWindow: jest.Mock;
  onStreamError: jest.Mock;
  beginWindow: jest.Mock;
};

beforeEach(() => {
  streamOpen = false;
  recordingOwned = false;
  inputConfigurationReady = false;
  resetBarrier = null;
  resetStarted = null;
  releaseStarted = null;
  jest.mocked(AudioManager.setAudioSessionActivity).mockImplementation(async () => {
    events.push('reset:start');
    resetStarted?.();
    await resetBarrier;
    inputConfigurationReady = true;
    events.push('reset:end');
  });
  // `resetMocks` strips the shared mock's implementation, and a subscription the
  // provider cannot remove would throw out of the session release.
  jest
    .mocked(AudioManager.addSystemEventListener)
    .mockImplementation(
      () =>
        ({ remove: jest.fn() }) as unknown as ReturnType<
          typeof AudioManager.addSystemEventListener
        >,
    );
  failNextOpen = false;
  closeBarrier = null;
  events = [];
  capture = {
    get isOpen() {
      return streamOpen;
    },
    isCapturing: false,
    open: jest.fn(async () => {
      events.push('open');
      if (!inputConfigurationReady) throw new Error('input graph attached before category reset');
      if (failNextOpen) {
        failNextOpen = false;
        throw new Error('native start failed');
      }
      streamOpen = true;
    }),
    close: jest.fn(async (options?: { releaseSession?: boolean }) => {
      events.push(options?.releaseSession ? 'release:start' : 'close');
      if (options?.releaseSession) {
        releaseStarted?.();
        await closeBarrier;
        events.push('release:end');
      }
      streamOpen = false;
    }),
    cancelWindow: jest.fn(),
    onStreamError: jest.fn(),
    beginWindow: jest.fn(),
  };
  jest
    .mocked(VoiceCaptureSession)
    .mockImplementation(() => capture as unknown as VoiceCaptureSession);
  jest.mocked(useAppSelectorShallow).mockImplementation(selector =>
    selector({
      settings: { voiceEnabled: true },
    } as RootState),
  );
  jest
    .mocked(useVoiceModel)
    .mockReturnValue({ state: 'ready', localPath: '/model' } as ReturnType<typeof useVoiceModel>);
  jest.mocked(useParakeetStt).mockReturnValue({
    isReady: true,
    isWarming: false,
    hotwordCount: 0,
    error: null,
    transcribe: jest.fn(),
  });
  jest
    .mocked(simpleAudioService.setRecordingSessionEnabled)
    .mockImplementation(async (enabled, options) => {
      // Model ownership separately from native readiness: the repeated grant
      // inside openCapture is a no-op after deferred ownership was recorded.
      if (!enabled) inputConfigurationReady = false;
      else if (options?.force || (!recordingOwned && !options?.deferToRecorder))
        inputConfigurationReady = true;
      recordingOwned = enabled;
      events.push(
        !enabled
          ? options?.force
            ? 'playback:force'
            : 'playback'
          : options?.force
            ? 'grant:force'
            : options?.deferToRecorder
              ? 'grant:defer'
              : 'grant',
      );
    });
});

test('an interruption ending during an armed window settles the attempt before reopening and allows retry', async () => {
  const { result, release } = await reviewAfterPrompt();
  await act(async () => result.current.setPlaybackPriority(false));
  let windowStarted!: () => void;
  const started = new Promise<void>(resolve => {
    windowStarted = resolve;
  });
  capture.beginWindow.mockImplementation(() => windowStarted());
  const settled = jest.fn();
  await act(async () => {
    void result.current.arm().then(settled);
    await started;
  });
  expect(settled).not.toHaveBeenCalled();
  const interruption = jest
    .mocked(AudioManager.addSystemEventListener)
    .mock.calls.find(([event]) => event === 'interruption')?.[1];
  expect(interruption).toBeDefined();
  await act(async () => {
    interruption?.({ type: 'ended' } as never);
    // Join the signal's queued rebuild, just as the next attempt does.
    await result.current.setPlaybackPriority(false);
  });

  expect(settled).toHaveBeenCalledWith({
    ok: false,
    reason: 'error',
    message: 'input stream reopening',
  });
  expect(result.current.isMicStreamOpen()).toBe(true);
  expect(capture.close).toHaveBeenCalledWith({ releaseSession: true });
  const startsBeforeRetry = capture.beginWindow.mock.calls.length;
  await act(async () => {
    void result.current.arm();
    await result.current.setPlaybackPriority(false);
  });
  expect(capture.beginWindow).toHaveBeenCalledTimes(startsBeforeRetry + 1);
  await act(async () => {
    await result.current.cancel();
    release();
    await result.current.setPlaybackPriority(true);
  });
});

async function reviewAfterPrompt() {
  const hook = renderHook(() => useVoiceGrading(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <VoiceGradingProvider>{children}</VoiceGradingProvider>
    ),
  });
  let release!: () => void;
  await act(async () => {
    release = hook.result.current.acquireSession();
    // Joins the acquisition handoff before handing the input to the prompt.
    await hook.result.current.setPlaybackPriority(true);
  });
  events.length = 0;
  return { ...hook, release };
}

test('watches interruptions only while a session holds the microphone', async () => {
  const { result } = renderHook(() => useVoiceGrading(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <VoiceGradingProvider>{children}</VoiceGradingProvider>
    ),
  });
  // Voice is on, but nothing holds the microphone. On Android, observing is a
  // request for long-term audio focus, which would stop another app's music for
  // a learner who only came to read.
  expect(AudioManager.observeAudioInterruptions).not.toHaveBeenCalled();
  expect(AudioManager.addSystemEventListener).not.toHaveBeenCalled();

  let releaseFirst!: () => void;
  let releaseSecond!: () => void;
  await act(async () => {
    releaseFirst = result.current.acquireSession();
    releaseSecond = result.current.acquireSession();
    await result.current.setPlaybackPriority(true);
  });
  expect(AudioManager.observeAudioInterruptions).toHaveBeenCalledTimes(1);
  expect(AudioManager.observeAudioInterruptions).toHaveBeenLastCalledWith(true);
  const listeners = jest.mocked(AudioManager.addSystemEventListener).mock;
  expect(listeners.calls.map(([name]) => name)).toEqual(['interruption', 'routeChange']);

  // One holder left: still a session, still watched.
  await act(async () => {
    releaseFirst();
    await result.current.setPlaybackPriority(true);
  });
  expect(AudioManager.observeAudioInterruptions).toHaveBeenCalledTimes(1);

  await act(async () => {
    releaseSecond();
    await result.current.setPlaybackPriority(true);
  });
  expect(AudioManager.observeAudioInterruptions).toHaveBeenCalledTimes(2);
  expect(AudioManager.observeAudioInterruptions).toHaveBeenLastCalledWith(false);
  for (const subscription of listeners.results) {
    expect(subscription.value.remove).toHaveBeenCalledTimes(1);
  }
});

test('two successive prompt restores reset native state before delegated input opening', async () => {
  const { result, release } = await reviewAfterPrompt();
  for (let card = 0; card < 2; card += 1) {
    await act(async () => result.current.setPlaybackPriority(false));
    expect(events).toEqual(['close', 'reset:start', 'reset:end', 'grant:defer', 'grant', 'open']);
    expect(result.current.isMicStreamOpen()).toBe(true);
    await act(async () => result.current.setPlaybackPriority(true));
    events.length = 0;
  }
  await act(async () => {
    release();
    await result.current.setPlaybackPriority(true);
  });
});

test('failed direct restore awaits full release before forced grant and disables later deferral', async () => {
  const { result, release } = await reviewAfterPrompt();
  failNextOpen = true;
  let completeClose!: () => void;
  closeBarrier = new Promise(resolve => {
    completeClose = resolve;
  });
  const releaseReached = new Promise<void>(resolve => {
    releaseStarted = resolve;
  });
  let restoring!: Promise<void>;
  await act(async () => {
    restoring = result.current.setPlaybackPriority(false);
    await releaseReached;
  });
  expect(events).toEqual([
    'close',
    'reset:start',
    'reset:end',
    'grant:defer',
    'grant',
    'open',
    'release:start',
  ]);
  expect(events).not.toContain('grant:force');
  await act(async () => {
    completeClose();
    await restoring;
  });
  expect(events.slice(-3)).toEqual(['release:end', 'grant:force', 'open']);
  expect(result.current.isMicStreamOpen()).toBe(true);
  await act(async () => result.current.setPlaybackPriority(true));
  events.length = 0;
  await act(async () => result.current.setPlaybackPriority(false));
  expect(events).toEqual(['grant', 'grant', 'open']);
  await act(async () => {
    release();
    await result.current.setPlaybackPriority(true);
  });
});

test('prompt and final release restore playback after delegated ownership', async () => {
  const { result, release } = await reviewAfterPrompt();
  await act(async () => result.current.setPlaybackPriority(false));
  events.length = 0;
  await act(async () => result.current.setPlaybackPriority(true));
  expect(events).toEqual(['close', 'playback']);
  events.length = 0;
  await act(async () => {
    release();
    await result.current.setPlaybackPriority(true);
  });
  expect(events).toEqual(['close', 'playback:force', 'playback']);
});

test('pending native reset prevents ownership grant and input opening', async () => {
  const { result, release } = await reviewAfterPrompt();
  let completeReset!: () => void;
  resetBarrier = new Promise(resolve => {
    completeReset = resolve;
  });
  const resetReached = new Promise<void>(resolve => {
    resetStarted = resolve;
  });
  let restoring!: Promise<void>;
  await act(async () => {
    restoring = result.current.setPlaybackPriority(false);
    await resetReached;
  });
  expect(events).toEqual(['close', 'reset:start']);
  expect(result.current.isMicStreamOpen()).toBe(false);
  await act(async () => {
    completeReset();
    await restoring;
  });
  expect(events).toEqual(['close', 'reset:start', 'reset:end', 'grant:defer', 'grant', 'open']);
  await act(async () => {
    release();
    await result.current.setPlaybackPriority(true);
  });
});

test('rejected native reset uses the established grant and disables subsequent deferral', async () => {
  const { result, release } = await reviewAfterPrompt();
  jest.mocked(AudioManager.setAudioSessionActivity).mockImplementationOnce(async () => {
    events.push('reset:rejected');
    throw new Error('deactivation refused');
  });
  await act(async () => result.current.setPlaybackPriority(false));
  expect(events).toEqual(['close', 'reset:rejected', 'grant', 'grant', 'open']);
  expect(result.current.isMicStreamOpen()).toBe(true);
  await act(async () => result.current.setPlaybackPriority(true));
  events.length = 0;
  await act(async () => result.current.setPlaybackPriority(false));
  expect(events).toEqual(['grant', 'grant', 'open']);
  await act(async () => {
    release();
    await result.current.setPlaybackPriority(true);
  });
});

function renderProvider() {
  return renderHook(() => useVoiceGrading(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <VoiceGradingProvider>{children}</VoiceGradingProvider>
    ),
  });
}

describe('holders', () => {
  test('a release that runs twice does not release another holder', async () => {
    const { result } = renderProvider();
    let first!: () => void;
    let second!: () => void;
    await act(async () => {
      first = result.current.acquireSession();
      second = result.current.acquireSession();
      await result.current.setPlaybackPriority(true);
    });
    await act(async () => {
      first();
      // A double cleanup (Fast Refresh, an effect torn down twice) must not
      // count twice, or the other screen's microphone goes with it.
      first();
      await result.current.setPlaybackPriority(true);
    });
    expect(AudioManager.observeAudioInterruptions).not.toHaveBeenCalledWith(false);

    await act(async () => {
      second();
      await result.current.setPlaybackPriority(true);
    });
    expect(AudioManager.observeAudioInterruptions).toHaveBeenLastCalledWith(false);
  });

  test('the recognizer outlives its last holder by the linger, and no longer', () => {
    const { result } = renderProvider();
    const retainedNow = () => jest.mocked(useParakeetStt).mock.lastCall?.[0].retained;
    expect(retainedNow()).toBe(false);

    let practiceTab!: () => void;
    let review!: () => void;
    act(() => {
      practiceTab = result.current.acquireEngine();
      review = result.current.acquireEngine();
    });
    expect(retainedNow()).toBe(true);

    act(() => {
      review();
      review();
      jest.advanceTimersByTime(120_000);
    });
    // The Practice tab still holds it.
    expect(retainedNow()).toBe(true);

    act(() => practiceTab());
    // Practice → review → Practice must not rebuild it...
    expect(retainedNow()).toBe(true);
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    // ...but someone who moved on to reading gets the memory back.
    expect(retainedNow()).toBe(false);
  });
});

describe('arm refusals', () => {
  test('a second arm while the first is still opening is refused as busy', async () => {
    const { result, release } = await reviewAfterPrompt();
    let second!: Promise<unknown>;
    await act(async () => {
      void result.current.arm();
      second = result.current.arm();
      await result.current.setPlaybackPriority(false);
    });
    await expect(second).resolves.toEqual({ ok: false, reason: 'busy' });
    await act(async () => {
      await result.current.cancel();
      release();
      await result.current.setPlaybackPriority(true);
    });
  });

  test('a recognizer that is not ready refuses the window', async () => {
    jest.mocked(useParakeetStt).mockReturnValue({
      isReady: false,
      isWarming: true,
      hotwordCount: 0,
      error: null,
      transcribe: jest.fn(),
    });
    const { result, release } = await reviewAfterPrompt();
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.arm();
    });
    expect(outcome).toEqual({ ok: false, reason: 'not-ready' });
    expect(capture.beginWindow).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await result.current.setPlaybackPriority(true);
    });
  });

  test('a refused microphone reports permission, with what open() said', async () => {
    const { result, release } = await reviewAfterPrompt();
    capture.open.mockImplementation(async () => {
      // The module is mocked, so the class carries no message of its own.
      const refused = new MicPermissionDeniedError();
      refused.message = 'Microphone permission denied';
      throw refused;
    });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.arm();
    });
    expect(outcome).toEqual({
      ok: false,
      reason: 'permission',
      message: 'Microphone permission denied',
    });
    await act(async () => {
      release();
      await result.current.setPlaybackPriority(true);
    });
  });
});

describe('meterLevel', () => {
  test('scales against the decayed loudest buffer, never below the floor', () => {
    // A buffer louder than anything so far becomes the reference: a full bar.
    expect(meterLevel(0.1, 0.02)).toEqual({ level: 1, peak: 0.1 });
    // Quieter speech after it reads against the decayed peak, on a sqrt curve.
    const after = meterLevel(0.025, 0.1);
    expect(after.peak).toBeCloseTo(0.0985);
    expect(after.level).toBeCloseTo(Math.sqrt(0.025 / 0.0985));
    // A silent room's noise is not amplified into a meter that claims speech.
    expect(meterLevel(0.001, 0)).toEqual({ level: Math.sqrt(0.001 / 0.02), peak: 0.02 });
  });
});
