/**
 * Regression tests for the prompt-audio gate — the signal that decides when the
 * voice-grading microphone may open.
 *
 * The bug these pin down was measured on device: the gate fired on the falling
 * edge of `status.playing`, and the native player's FIRST real status update
 * (~15 ms after play(), while it is still spinning up) reports `playing: false`.
 * A 1416 ms word was therefore declared finished after 16 ms, on every card, so
 * the mic opened over the prompt — recording the prompt instead of the learner,
 * and on iOS yanking the audio session into playAndRecord mid-word, which is
 * heard as the prompt suddenly going quiet.
 */
import {
  PROMPT_FINISH_GRACE_MS,
  PROMPT_MAX_WAIT_MS,
  watchPromptFinish,
  type PromptStatusSource,
} from '@/hooks/review/promptFinishWatcher';
import type { AudioStatus } from '@/services/audioPlayer';

const TRACK = { id: 'prompt-1', audioUrl: 'file:///kitab.mp3', title: 'Review Audio' };

const IDLE: AudioStatus = {
  playing: false,
  currentTime: 0,
  duration: 0,
  currentTrack: null,
  isLoaded: false,
  isBuffering: false,
  playbackState: 'idle',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  didJustFinish: false,
};

/** Replays a real player's status stream into the watcher. */
function createSource(initial: Partial<AudioStatus> = {}) {
  let status: AudioStatus = { ...IDLE, ...initial };
  const listeners = new Set<(s: AudioStatus) => void>();
  const source: PromptStatusSource = {
    getStatus: () => status,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    source,
    emit(patch: Partial<AudioStatus>) {
      status = { ...status, ...patch };
      listeners.forEach(listener => listener(status));
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

/** The state simpleAudioService publishes the instant play() is invoked. */
const OPTIMISTIC_PLAYING: Partial<AudioStatus> = {
  playing: true,
  currentTrack: TRACK,
  playbackState: 'idle',
};

describe('watchPromptFinish', () => {
  // This project's jest setup fakes timers but NOT Date, and the watcher's
  // backstops are wall-clock comparisons. Drive both from one controlled clock.
  let now = 0;
  let dateSpy: jest.SpyInstance<number, []>;

  const advance = (ms: number): void => {
    now += ms;
    jest.advanceTimersByTime(ms);
  };

  beforeEach(() => {
    jest.clearAllTimers();
    now = 1_700_000_000_000;
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  test('ignores the native player\'s initial "playing: false" tick', () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);

    // ~15 ms in: loaded and ready, but not yet playing. The old implementation
    // read this as end-of-clip.
    emit({ playing: false, isLoaded: true, playbackState: 'ready', duration: 1.4 });
    advance(PROMPT_FINISH_GRACE_MS + 100);

    expect(onFinish).not.toHaveBeenCalled();
  });

  test("finishes on the player's own didJustFinish event", () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);

    emit({ playing: false, isLoaded: true, playbackState: 'ready', duration: 1.4 });
    emit({ playing: true, currentTime: 0.5, duration: 1.4, playbackState: 'playing' });
    expect(onFinish).not.toHaveBeenCalled();

    emit({
      playing: false,
      currentTime: 1.4,
      duration: 1.4,
      playbackState: 'ended',
      didJustFinish: true,
    });

    // The grace keeps the mic off the tail of the word.
    expect(onFinish).not.toHaveBeenCalled();
    advance(PROMPT_FINISH_GRACE_MS);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('falls back to the play head when no finish event ever arrives', () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);

    // 100 ms of a 1.0 s clip left, and then the player goes silent — no
    // didJustFinish, no further ticks. The mic must still open.
    emit({ playing: true, currentTime: 0.9, duration: 1.0, playbackState: 'playing' });
    expect(onFinish).not.toHaveBeenCalled();

    // Past the estimated end: the first poll settles the watcher…
    // (advanced by exactly one poll interval, so this stays true whatever
    // PROMPT_FINISH_GRACE_MS is tuned to)
    advance(100);
    expect(onFinish).not.toHaveBeenCalled();
    // …and the grace elapses before the mic is handed the card.
    advance(PROMPT_FINISH_GRACE_MS);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('does not cut the clip short: the backstop waits out the full duration', () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);
    emit({ playing: true, currentTime: 0, duration: 1.4, playbackState: 'playing' });

    advance(1200);
    expect(onFinish).not.toHaveBeenCalled();

    advance(300);
    advance(PROMPT_FINISH_GRACE_MS);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('finishes immediately when the track is torn down under it', () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);
    emit({ playing: false, currentTrack: null, playbackState: 'idle' });

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('never hangs the mic when the player reports nothing at all', () => {
    const onFinish = jest.fn();
    const { source } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => false, source);

    advance(PROMPT_MAX_WAIT_MS - 500);
    expect(onFinish).not.toHaveBeenCalled();

    advance(600);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('cancelling settles the watcher and releases its subscription', () => {
    const onFinish = jest.fn();
    const probe = createSource(OPTIMISTIC_PLAYING);

    const cancel = watchPromptFinish(onFinish, () => false, probe.source);
    expect(probe.listenerCount).toBe(1);

    cancel();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(probe.listenerCount).toBe(0);

    // A late status must not fire it a second time.
    probe.emit({ didJustFinish: true, playbackState: 'ended' });
    advance(PROMPT_FINISH_GRACE_MS);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('a card that advanced mid-prompt finishes without the grace delay', () => {
    const onFinish = jest.fn();
    const { source, emit } = createSource(OPTIMISTIC_PLAYING);

    watchPromptFinish(onFinish, () => true, source);
    emit({ playing: true, currentTime: 0.2, duration: 1.4 });

    // isCancelled() short-circuits on the very first evaluate, synchronously.
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
