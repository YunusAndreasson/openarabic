import { act, renderHook } from '@testing-library/react-native';

import { useToast, useVoiceGrading } from '@/components/providers';
import { armRetryDelay, useVoiceReview } from '@/hooks/review/useVoiceReview';
import { __resetMicPermissionForTests } from '@/lib/voice/recording';
import { logVoiceArmFailure, logVoiceAttempt } from '@/services/voiceTelemetry';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { lightFeedback } from '@/utils/haptics';

jest.mock('@/components/providers', () => ({ useToast: jest.fn(), useVoiceGrading: jest.fn() }));
jest.mock('@/store/hooks', () => ({ useAppDispatch: jest.fn(), useAppSelectorShallow: jest.fn() }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/voiceTelemetry', () => ({
  // The real row builder: it is pure, and every graded attempt goes through it.
  buildVoiceAttemptLog: jest.requireActual<typeof import('@/services/voiceTelemetry')>(
    '@/services/voiceTelemetry',
  ).buildVoiceAttemptLog,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('react-native-audio-api');

beforeEach(() => {
  // The shared AudioManager mock grants the microphone; an unresolved
  // permission check would read as a refusal — which is exactly the state in
  // which hands-free is supposed to keep the tap.
  __resetMicPermissionForTests();

  const state = {
    settings: { voiceEnabled: true, voiceDebugEnabled: false },
    voiceAliases: { byRoot: {} },
  } as unknown as RootState;
  jest.mocked(useAppSelectorShallow).mockImplementation(selector => selector(state));
  jest.mocked(useAppDispatch).mockReturnValue(jest.fn());
  jest.mocked(useToast).mockReturnValue({ showToast: jest.fn() });
  voice = {
    enabled: true,
    isReady: true,
    isWarming: false,
    error: null,
    acquireEngine: jest.fn(() => jest.fn()),
    offerHotwordGlosses: jest.fn(),
    hotwordCount: 0,
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

interface Props {
  key: string;
  sessionGlosses?: readonly string[];
  /** The card whose Arabic prompt has finished — hands-free arms on this. */
  promptDoneKey?: string | null;
  handsFree?: boolean;
}

function renderReview(initialProps: Props = { key: 'first' }) {
  return renderHook<ReturnType<typeof useVoiceReview>, Props>(
    ({ key, sessionGlosses, promptDoneKey = null, handsFree = false }) =>
      useVoiceReview({
        expected: 'book',
        currentWordKey: key,
        sessionGlosses,
        rootId: null,
        ready: true,
        promptDoneKey,
        handsFree,
        stopAudio,
        ...callbacks,
      }),
    { initialProps },
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

/** A capture that opened and returned some audio for the recognizer. */
const capturedSpeech = (): Awaited<ReturnType<Voice['arm']>> => ({
  ok: true,
  result: {
    gateUsed: 'vad',
    waveform: new Float32Array(1600),
    sampleRate: 16000,
    durationMs: 1200,
    heardSpeech: true,
    peakRms: 0.04,
    noiseFloorDb: -58,
    speechMs: 600,
    levelsDb: [],
    bufferCount: 12,
    stopReason: 'silence',
    firstBufferMs: 40,
    stopDecidedAtMs: 1200,
  },
});

test('a tapped window going live gives the "go" tick', async () => {
  jest.mocked(voice.arm).mockImplementationOnce(options => {
    options?.onCapturing?.();
    return new Promise(() => undefined);
  });
  const { result } = renderReview();

  await act(async () => result.current.speakNow());

  expect(lightFeedback).toHaveBeenCalledTimes(1);
});

/**
 * Disclosure honesty. A miss that shows and plays the English has ended the
 * recall test, so a retry on that card can repeat the answer but cannot earn
 * "Knew it" with it; and a hearing failure is the app's fault, so it must not
 * give the answer away at all.
 */
describe('disclosure', () => {
  test('a hearing failure keeps the answer hidden', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('');
    jest.mocked(voice.arm).mockResolvedValueOnce(capturedSpeech());
    const { result } = renderReview();

    await act(async () => result.current.speakNow());

    expect(result.current.phase).toBe('result');
    expect(result.current.result?.heard).toBe('');
    expect(callbacks.onRevealAnswer).not.toHaveBeenCalled();
    expect(callbacks.onMissHeard).not.toHaveBeenCalled();
  });

  test('a retry after a hearing failure can still earn "Knew it"', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('').mockResolvedValueOnce('book');
    jest
      .mocked(voice.arm)
      .mockResolvedValueOnce(capturedSpeech())
      .mockResolvedValueOnce(capturedSpeech());
    const { result } = renderReview();

    await act(async () => result.current.speakNow());
    await act(async () => result.current.retry());

    expect(callbacks.onKnownAuto).toHaveBeenCalledTimes(1);
    expect(callbacks.onVagueAuto).not.toHaveBeenCalled();
  });

  test('a heard wrong word discloses the answer', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('table');
    jest.mocked(voice.arm).mockResolvedValueOnce(capturedSpeech());
    const { result } = renderReview();

    await act(async () => result.current.speakNow());

    expect(result.current.result?.heard).toBe('table');
    expect(callbacks.onMissHeard).toHaveBeenCalledTimes(1);
    expect(callbacks.onRevealAnswer).toHaveBeenCalledTimes(1);
  });

  test('a retry after the answer was disclosed is credited as vague, never Knew it', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('table').mockResolvedValueOnce('book');
    jest
      .mocked(voice.arm)
      .mockResolvedValueOnce(capturedSpeech())
      .mockResolvedValueOnce(capturedSpeech());
    const { result } = renderReview();

    await act(async () => result.current.speakNow());
    await act(async () => result.current.retry());

    expect(callbacks.onVagueAuto).toHaveBeenCalledTimes(1);
    expect(callbacks.onKnownAuto).not.toHaveBeenCalled();
  });

  test('"Got it" after a disclosure keeps its meaning', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('table');
    jest.mocked(voice.arm).mockResolvedValueOnce(capturedSpeech());
    const { result } = renderReview();

    await act(async () => result.current.speakNow());
    act(() => result.current.accept());

    expect(callbacks.onKnownAuto).toHaveBeenCalledTimes(1);
  });

  test('the cap belongs to the card that was disclosed', async () => {
    jest.mocked(voice.transcribe).mockResolvedValueOnce('table').mockResolvedValueOnce('book');
    jest
      .mocked(voice.arm)
      .mockResolvedValueOnce(capturedSpeech())
      .mockResolvedValueOnce(capturedSpeech());
    const view = renderReview({ key: 'first' });

    await act(async () => view.result.current.speakNow());
    await act(async () => view.rerender({ key: 'second' }));
    await act(async () => view.result.current.speakNow());

    expect(callbacks.onKnownAuto).toHaveBeenCalledTimes(1);
    expect(callbacks.onVagueAuto).not.toHaveBeenCalled();
  });
});

test('callbacks replaced while an attempt is in flight are the ones that fire', async () => {
  // The screen builds these inline, so every render hands over new ones, and
  // the hook only calls them once the attempt it started has been graded.
  let deliverFirstCapture!: (outcome: Awaited<ReturnType<Voice['arm']>>) => void;
  jest
    .mocked(voice.arm)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          deliverFirstCapture = resolve;
        }),
    )
    .mockResolvedValueOnce(capturedSpeech());
  jest.mocked(voice.transcribe).mockResolvedValueOnce('table').mockResolvedValueOnce('book');
  const stale = { onVagueAuto: jest.fn(), onRevealAnswer: jest.fn(), onMissHeard: jest.fn() };
  const latest = { onVagueAuto: jest.fn(), onRevealAnswer: jest.fn(), onMissHeard: jest.fn() };
  const view = renderHook(
    ({ handlers }: { handlers: typeof stale }) =>
      useVoiceReview({
        expected: 'book',
        currentWordKey: 'first',
        rootId: null,
        ready: true,
        promptDoneKey: null,
        handsFree: false,
        stopAudio,
        ...callbacks,
        ...handlers,
      }),
    { initialProps: { handlers: stale } },
  );

  act(() => view.result.current.speakNow());
  view.rerender({ handlers: latest });
  // A heard wrong word marks the card and discloses the answer...
  await act(async () => deliverFirstCapture(capturedSpeech()));
  // ...so the right word on the retry is credited as vague.
  await act(async () => view.result.current.retry());

  expect(latest.onMissHeard).toHaveBeenCalledTimes(1);
  expect(latest.onRevealAnswer).toHaveBeenCalledTimes(1);
  expect(latest.onVagueAuto).toHaveBeenCalledTimes(1);
  expect(stale.onMissHeard).not.toHaveBeenCalled();
  expect(stale.onRevealAnswer).not.toHaveBeenCalled();
  expect(stale.onVagueAuto).not.toHaveBeenCalled();
});

test('the debug HUD picks up the latest attempt when it is switched on mid-session', async () => {
  let debugEnabled = false;
  jest.mocked(useAppSelectorShallow).mockImplementation(selector =>
    selector({
      settings: { voiceEnabled: true, voiceDebugEnabled: debugEnabled },
      voiceAliases: { byRoot: {} },
    } as unknown as RootState),
  );
  jest.mocked(voice.transcribe).mockResolvedValueOnce('table');
  jest.mocked(voice.arm).mockResolvedValueOnce(capturedSpeech());
  const view = renderReview();

  await act(async () => view.result.current.speakNow());
  // Hidden instrumentation must not repaint the review screen...
  expect(view.result.current.debug.transcript).toBe('');

  // ...but a HUD switched on afterwards shows what was already measured.
  debugEnabled = true;
  await act(async () => view.rerender({ key: 'first' }));
  expect(view.result.current.debug.transcript).toBe('table');
  expect(view.result.current.debug.recorder).toMatchObject({ bufferCount: 12, gateUsed: 'vad' });
  // The recorder stats, not the capture itself.
  expect(view.result.current.debug.recorder).not.toHaveProperty('waveform');
});

test('a tapped, correct answer writes its row as an auto-pass', async () => {
  jest.mocked(voice.transcribe).mockResolvedValueOnce('book');
  jest.mocked(voice.arm).mockResolvedValueOnce(capturedSpeech());
  const { result } = renderReview();

  await act(async () => result.current.speakNow());

  expect(logVoiceAttempt).toHaveBeenCalledTimes(1);
  expect(logVoiceAttempt).toHaveBeenCalledWith(
    expect.objectContaining({
      resolution: 'auto_known',
      transcript: 'book',
      matched: true,
      matchMethod: 'exact',
      durationMs: 1200,
      bufferCount: 12,
      meta: expect.objectContaining({
        armTrigger: 'tap',
        answerDisclosed: false,
        gate: { used: 'vad', noiseFloorDb: -58, speechMs: 600, levelsDb: [] },
      }),
    }),
  );
});

test('a card that never gets a microphone writes one row, after the whole ladder', async () => {
  jest.useFakeTimers();
  jest.mocked(voice.arm).mockResolvedValue({ ok: false, reason: 'error', message: 'stream dead' });
  try {
    const { result, unmount } = renderReview();
    await act(async () => result.current.speakNow());
    for (const backoff of [250, 500, 750]) {
      await act(async () => {
        jest.advanceTimersByTime(backoff);
      });
    }
    expect(voice.arm).toHaveBeenCalledTimes(4);
    expect(logVoiceArmFailure).toHaveBeenCalledTimes(1);
    expect(logVoiceArmFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptIndex: 3,
        reason: 'error',
        message: 'stream dead',
        meta: expect.objectContaining({ phase: 'gave-up' }),
      }),
    );
    unmount();
  } finally {
    jest.useRealTimers();
  }
});

test('the arm ladder backs off 250, 500 and 750 ms, then gives up', () => {
  // A microphone that needs four goes is broken, not slow.
  expect([0, 1, 2, 3].map(failures => armRetryDelay(failures))).toEqual([250, 500, 750, null]);
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

/**
 * Hands-free: the microphone opens itself once the Arabic prompt has finished,
 * and the learner just answers.
 *
 * The tap it replaces was not an accident — it was put there because arming on
 * a timer meant guessing when someone was ready to speak. What makes the guess
 * safe now is the VAD, which answers "is this a voice" rather than "is this
 * loud", so an open microphone through the thinking pause costs nothing. These
 * cases hold the parts of that which are NOT the detector: when the window may
 * open, how often, and what happens when it hears nobody.
 */
describe('hands-free arming', () => {
  /** Mounted, prompt still playing, then the prompt ends for this card. */
  const arriveAndFinishPrompt = async () => {
    const view = renderReview({ key: 'first', handsFree: true, promptDoneKey: null });
    // The permission check is async and hands-free will not arm without it —
    // the OS dialog has no tap to attach itself to here.
    await act(async () => undefined);
    await act(async () => {
      view.rerender({ key: 'first', handsFree: true, promptDoneKey: 'first' });
    });
    return view;
  };

  test('opens the mic when the prompt ends, with no tap', async () => {
    const { result } = await arriveAndFinishPrompt();
    expect(voice.arm).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('arming');
  });

  test('waits for the prompt rather than recording it', async () => {
    // The input stream is dropped for the whole prompt so the word plays at
    // full volume; a window opened before it ends could only capture the app
    // talking to itself.
    const view = renderReview({ key: 'first', handsFree: true, promptDoneKey: null });
    await act(async () => undefined);
    expect(voice.arm).not.toHaveBeenCalled();

    // A key from the PREVIOUS card is not this card's prompt finishing.
    await act(async () => {
      view.rerender({ key: 'first', handsFree: true, promptDoneKey: 'stale' });
    });
    expect(voice.arm).not.toHaveBeenCalled();
  });

  test('opens once per card, however often the screen re-renders', async () => {
    const view = await arriveAndFinishPrompt();
    await act(async () => {
      view.rerender({ key: 'first', handsFree: true, promptDoneKey: 'first' });
      view.rerender({ key: 'first', handsFree: true, promptDoneKey: 'first' });
    });
    // Re-arming would throw away audio the learner has already spoken.
    expect(voice.arm).toHaveBeenCalledTimes(1);
  });

  test('a self-opened window going live does not buzz', async () => {
    // Hands-free opens the mic after every prompt; the word ending and the
    // meter moving are the cue. A haptic too would land on every single card.
    jest.mocked(voice.arm).mockImplementationOnce(options => {
      options?.onCapturing?.();
      return new Promise(() => undefined);
    });

    await arriveAndFinishPrompt();

    expect(voice.arm).toHaveBeenCalledTimes(1);
    expect(lightFeedback).not.toHaveBeenCalled();
  });

  test('tells the provider to widen the window it is opening', async () => {
    await arriveAndFinishPrompt();
    // The deadline that waits for speech has to cover the learner thinking; a
    // tapped window's does not, because the tap IS "I am about to speak".
    expect(voice.arm).toHaveBeenCalledWith(expect.objectContaining({ handsFree: true }));
  });

  test('keeps microphone denial across card changes', async () => {
    jest.mocked(voice.arm).mockResolvedValueOnce({ ok: false, reason: 'permission' });
    const view = renderReview({ key: 'first', handsFree: false, promptDoneKey: 'first' });
    await act(async () => undefined);
    await act(async () => view.result.current.speakNow());
    expect(view.result.current.micDenied).toBe(true);
    await act(async () =>
      view.rerender({ key: 'second', handsFree: false, promptDoneKey: 'second' }),
    );
    expect(view.result.current.micDenied).toBe(true);
    expect(view.result.current.handsFreeActive).toBe(false);
  });

  test('keeps the tap until the microphone permission exists', async () => {
    // The tap on "Speak to answer" used to be the one moment the OS dialog
    // could appear with a reason attached to it, and a microphone prompt that
    // arrives unasked-for seconds into a first session is the kind that gets
    // refused for good. So a first install keeps the button; the tap grants the
    // permission in context, and every card after it opens by itself.
    __mocks.AudioManager.checkRecordingPermissions.mockResolvedValue('Undetermined');
    __resetMicPermissionForTests();

    const view = renderReview({ key: 'first', handsFree: true, promptDoneKey: null });
    await act(async () => undefined);
    await act(async () => {
      view.rerender({ key: 'first', handsFree: true, promptDoneKey: 'first' });
    });
    expect(voice.arm).not.toHaveBeenCalled();
    // And it must SAY it is not driving, because the screen hides the button on
    // this value alone. Reporting "hands-free" here while the mic never opens
    // is a fresh install with no button, no dialog and no way to reach voice at
    // all — which is exactly what shipped before this assertion existed.
    expect(view.result.current.handsFreeActive).toBe(false);

    // The tap still works, and it is what asks.
    act(() => view.result.current.speakNow());
    expect(voice.prewarmPermission).toHaveBeenCalledTimes(1);
    expect(voice.arm).toHaveBeenCalledTimes(1);
  });

  test('is not driving anything while voice itself is switched off', async () => {
    // `voiceHandsFree` keeps its own default when voice goes off, and the
    // toggle for it is hidden behind `voiceEnabled` in Account → Practice, so
    // it cannot be turned back off. Reading the setting alone would leave the
    // band's only button painted as the quiet peer of a control that is not
    // there.
    jest.mocked(useAppSelectorShallow).mockImplementation(selector =>
      selector({
        settings: { voiceEnabled: false, voiceDebugEnabled: false },
        voiceAliases: { byRoot: {} },
      } as unknown as RootState),
    );
    const view = renderReview({ key: 'first', handsFree: true, promptDoneKey: 'first' });
    await act(async () => undefined);

    expect(view.result.current.handsFreeActive).toBe(false);
    expect(voice.arm).not.toHaveBeenCalled();
  });

  test('changes nothing while it is switched off', async () => {
    const view = renderReview({ key: 'first', handsFree: false, promptDoneKey: null });
    await act(async () => {
      view.rerender({ key: 'first', handsFree: false, promptDoneKey: 'first' });
    });
    expect(voice.arm).not.toHaveBeenCalled();

    act(() => view.result.current.speakNow());
    expect(voice.arm).toHaveBeenCalledWith(expect.objectContaining({ handsFree: false }));
  });

  test('still grades a short answer that stopped as noSpeech', async () => {
    // `noSpeech` means "not ENOUGH speech", not "none": a confirmed run of
    // voice that fell under minSpeechMs stops with the same reason. Discarding
    // that is the worst thing this feature could do — the learner speaks, waits
    // out the whole budget and is told nothing — so `heardSpeech` is the line,
    // not the stop reason.
    jest.mocked(voice.transcribe).mockResolvedValue('book');
    jest.mocked(voice.arm).mockResolvedValueOnce({
      ok: true,
      result: {
        gateUsed: 'vad',
        waveform: new Float32Array(1600),
        sampleRate: 16000,
        durationMs: 25000,
        heardSpeech: true,
        peakRms: 0.04,
        noiseFloorDb: -58,
        speechMs: 200,
        levelsDb: [],
        bufferCount: 250,
        stopReason: 'noSpeech',
        firstBufferMs: 40,
        stopDecidedAtMs: 25000,
      },
    });
    const { result } = await arriveAndFinishPrompt();

    expect(voice.transcribe).toHaveBeenCalled();
    // Still driving, so the screen keeps the band to one button.
    expect(result.current.handsFreeActive).toBe(true);
    // It matched, so the card advances as Known rather than stranding them.
    expect(callbacks.onKnownAuto).toHaveBeenCalledTimes(1);
  });

  test('hands the control back when a self-opened window hears nobody', async () => {
    jest.mocked(voice.arm).mockResolvedValueOnce({
      ok: true,
      result: {
        gateUsed: 'vad',
        waveform: new Float32Array(0),
        sampleRate: 16000,
        durationMs: 25000,
        heardSpeech: false,
        peakRms: 0.0004,
        noiseFloorDb: -58,
        speechMs: 0,
        levelsDb: [],
        bufferCount: 250,
        stopReason: 'noSpeech',
        firstBufferMs: 40,
        stopDecidedAtMs: 25000,
      },
    });
    const { result } = await arriveAndFinishPrompt();

    // Nothing was attempted, so nothing is graded and no panel appears: a card
    // the learner never chose to speak to must not be marked on their behalf.
    // No longer driving, so the screen puts "Speak to answer" back.
    expect(result.current.handsFreeActive).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.phase).toBe('idle');
    expect(voice.transcribe).not.toHaveBeenCalled();
    // And it does not reopen: an invisible microphone that retries forever is
    // the one shape this must never take.
    expect(voice.arm).toHaveBeenCalledTimes(1);
  });
});

test("offers the session's answers as hotwords once, however the list is ordered", () => {
  const { rerender } = renderReview({ key: 'first', sessionGlosses: ['house', 'book'] });
  expect(voice.offerHotwordGlosses).toHaveBeenCalledTimes(1);
  expect(voice.offerHotwordGlosses).toHaveBeenCalledWith(['book', 'house']);

  // A new card and a reordered, rebuilt array are the same vocabulary.
  rerender({ key: 'second', sessionGlosses: ['book', 'house'] });
  expect(voice.offerHotwordGlosses).toHaveBeenCalledTimes(1);
});

test('offers nothing before the session knows its words', () => {
  renderReview({ key: 'first', sessionGlosses: [] });
  expect(voice.offerHotwordGlosses).not.toHaveBeenCalled();
});
