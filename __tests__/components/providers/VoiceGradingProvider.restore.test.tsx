import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AudioManager } from 'react-native-audio-api';

import { VoiceGradingProvider, useVoiceGrading } from '@/components/providers/VoiceGradingProvider';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { VoiceCaptureSession } from '@/lib/voice/recording';
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
