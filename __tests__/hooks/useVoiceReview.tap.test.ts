import { act, renderHook } from '@testing-library/react-native';

import { useToast, useVoiceGrading } from '@/components/providers';
import { useVoiceReview } from '@/hooks/review/useVoiceReview';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import type { RootState } from '@/store/store';

jest.mock('@/components/providers', () => ({ useToast: jest.fn(), useVoiceGrading: jest.fn() }));
jest.mock('@/store/hooks', () => ({ useAppDispatch: jest.fn(), useAppSelectorShallow: jest.fn() }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/voiceTelemetry', () => ({
  logVoiceArmFailure: jest.fn(),
  logVoiceAttempt: jest.fn(),
}));
jest.mock('@/services/voiceModelStore', () => ({ getVoiceModelSnapshot: jest.fn() }));
jest.mock('@/utils/errorHandling', () => ({ voiceBreadcrumb: jest.fn() }));
jest.mock('@/utils/haptics', () => ({ lightFeedback: jest.fn(), warningFeedback: jest.fn() }));
jest.mock('@/utils/reviewDiagnostics', () => ({
  countDiag: jest.fn(),
  mark: jest.fn(),
  span: () => () => undefined,
}));
jest.mock('@/utils/armTelemetry', () => ({ getArmStages: jest.fn(), markArmTap: jest.fn() }));
jest.mock('@/utils/promptTelemetry', () => ({
  getPromptSnapshot: jest.fn(),
  recordPromptCut: jest.fn(),
}));

type Voice = ReturnType<typeof useVoiceGrading>;
let voice: Voice;
const stopAudio = jest.fn();
const callbacks = {
  onKnownAuto: jest.fn(),
  onVagueAuto: jest.fn(),
  onUnknownAuto: jest.fn(),
  onRevealAnswer: jest.fn(),
  onMissHeard: jest.fn(),
};

beforeEach(() => {
  const state = {
    settings: { voiceEnabled: true, voiceDebugEnabled: false },
    voiceAliases: { byRoot: {} },
  } as unknown as RootState;
  jest.mocked(useAppSelectorShallow).mockImplementation(selector => selector(state));
  jest.mocked(useAppDispatch).mockReturnValue(jest.fn());
  jest.mocked(useToast).mockReturnValue({ showToast: jest.fn(), showImportantToast: jest.fn() });
  voice = {
    enabled: true,
    isReady: true,
    isWarming: false,
    error: null,
    acquireEngine: jest.fn(() => jest.fn()),
    acquireSession: jest.fn(() => jest.fn()),
    prewarmPermission: jest.fn(async () => undefined),
    // Keep native opening pending until the test chooses its outcome.
    arm: jest.fn(() => new Promise(() => undefined)),
    cancel: jest.fn(async () => undefined),
    stopListening: jest.fn(),
    transcribe: jest.fn(),
    setPlaybackPriority: jest.fn(),
    isMicStreamOpen: jest.fn(),
    micLevel: {} as Voice['micLevel'],
  };
  jest.mocked(useVoiceGrading).mockReturnValue(voice);
});

function renderReview() {
  return renderHook<ReturnType<typeof useVoiceReview>, { key: string }>(
    ({ key }) =>
      useVoiceReview({
        expected: 'book',
        currentWordKey: key,
        rootId: null,
        ready: true,
        stopAudio,
        ...callbacks,
      }),
    { initialProps: { key: 'first' } },
  );
}

test('rapid taps before React commits accept one request and stop playback once', () => {
  const { result } = renderReview();
  act(() => {
    result.current.speakNow();
    result.current.speakNow();
    result.current.speakNow();
  });
  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(voice.prewarmPermission).toHaveBeenCalledTimes(1);
  expect(voice.arm).toHaveBeenCalledTimes(1);
  expect(result.current.phase).toBe('arming');
});

test('taps during native opening leave the original request running', () => {
  const { result } = renderReview();
  act(() => result.current.speakNow());
  const cancellations = jest.mocked(voice.cancel).mock.calls.length;
  act(() => result.current.speakNow());
  expect(voice.arm).toHaveBeenCalledTimes(1);
  expect(voice.cancel).toHaveBeenCalledTimes(cancellations);
  expect(stopAudio).toHaveBeenCalledTimes(1);
});

test('advancing from a pending open allows an explicit tap on the next card', () => {
  const { result, rerender } = renderReview();
  act(() => result.current.speakNow());
  rerender({ key: 'second' });
  expect(result.current.phase).toBe('idle');
  act(() => result.current.speakNow());
  expect(voice.arm).toHaveBeenCalledTimes(2);
});

test('a transient open failure still retries automatically', async () => {
  jest.useFakeTimers();
  jest.mocked(voice.arm).mockResolvedValueOnce({ ok: false, reason: 'error' });
  try {
    const { result, unmount } = renderReview();
    await act(async () => result.current.speakNow());
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(voice.arm).toHaveBeenCalledTimes(2);
    unmount();
  } finally {
    jest.useRealTimers();
  }
});
