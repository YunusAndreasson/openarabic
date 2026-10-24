import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { playTransitionSound } from '@/utils/transitionSound';

type StatusListener = (status: { playing?: boolean; didJustFinish?: boolean }) => void;

describe('playTransitionSound', () => {
  let emit: StatusListener;
  const subscription = { remove: jest.fn() };
  const player = {
    play: jest.fn(),
    remove: jest.fn(),
    volume: 0,
    addListener: jest.fn((_event: string, listener: StatusListener) => {
      emit = listener;
      return subscription;
    }),
  };

  /** Let the awaiting call observe what the test just did. */
  const flush = () => new Promise(resolve => setImmediate(resolve));

  beforeEach(() => {
    // Timers under the test's control; setImmediate stays real for flush().
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    emit = () => undefined;
    player.volume = 0;
    player.addListener.mockImplementation((_event: string, listener: StatusListener) => {
      emit = listener;
      return subscription;
    });
    jest.mocked(createAudioPlayer).mockReturnValue(player as unknown as AudioPlayer);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('plays the bundled asset directly, with no asset download first', async () => {
    const done = playTransitionSound();
    await flush();

    // A module id, handed straight to the player.
    expect(createAudioPlayer).toHaveBeenCalledWith(
      require('@/assets/sounds/switch.mp3'),
      expect.objectContaining({ keepAudioSessionActive: true }),
    );
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.volume).toBe(1);

    emit({ didJustFinish: true });
    await done;
  });

  test('ends on the finish event, and leaves no fallback timer or player behind', async () => {
    let finished = false;
    const done = playTransitionSound().then(() => {
      finished = true;
    });
    await flush();

    // A playing flip alone is not the end — an interruption flips it too.
    emit({ playing: true });
    emit({ playing: false });
    await flush();
    expect(finished).toBe(false);

    emit({ didJustFinish: true });
    await done;

    expect(jest.getTimerCount()).toBe(0);
    expect(subscription.remove).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalledTimes(1);
  });

  test('gives up after two seconds when no finish event arrives', async () => {
    let finished = false;
    const done = playTransitionSound().then(() => {
      finished = true;
    });
    await flush();

    jest.advanceTimersByTime(1999);
    await flush();
    expect(finished).toBe(false);

    jest.advanceTimersByTime(1);
    await done;
    expect(player.remove).toHaveBeenCalledTimes(1);
  });
});
