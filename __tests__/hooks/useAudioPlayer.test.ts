import { renderHook, act } from '@testing-library/react-native';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';

import { AUDIO_STATES } from '../../constants/audio';

let mockStatus = { playing: false, isLoaded: false };
const mockAudioPlayer = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() };

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => mockAudioPlayer),
  useAudioPlayerStatus: () => mockStatus,
  setAudioModeAsync: jest.fn(),
}));

jest.mock('../../services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn(),
  },
}));

// Import after mocking
const { audioCache } = require('../../services/audioCache');
const { useAudioPlayer } = require('../../hooks/audio/useAudioPlayer');

const createState = (isLoading: boolean) => ({
  currentTrack: { id: 't1', audioUrl: 'test.mp3', title: 'test' },
  queue: [{ id: 't1', audioUrl: 'test.mp3', title: 'test' }],
  currentIndex: 0,
  isLoading,
  shouldAutoPlay: false,
});

describe('useAudioPlayer audioState', () => {
  const originalUseReducer = React.useReducer;
  const reducerSpy = jest.spyOn(React, 'useReducer');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    reducerSpy.mockReset();
  });

  afterAll(() => {
    reducerSpy.mockRestore();
  });

  test.each([
    [false, false, false, AUDIO_STATES.LOADING],
    [false, false, true, AUDIO_STATES.LOADING],
    [false, true, false, AUDIO_STATES.STOPPED],
    [false, true, true, AUDIO_STATES.LOADING],
    [true, false, false, AUDIO_STATES.LOADING],
    [true, false, true, AUDIO_STATES.LOADING],
    [true, true, false, AUDIO_STATES.PLAYING],
    [true, true, true, AUDIO_STATES.LOADING],
  ])(
    'returns %s when playing=%s loaded=%s loading=%s',
    (isPlaying, isLoaded, isLoading, expected) => {
      mockStatus = { playing: isPlaying, isLoaded } as any;
      reducerSpy.mockImplementation(() =>
        originalUseReducer(() => createState(isLoading), createState(isLoading)),
      );

      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.audioState).toBe(expected);
    },
  );
});

describe('prefetchTracks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns tracks with cached urls when available', async () => {
    (audioCache.getAudio as jest.Mock).mockImplementation(url =>
      url.includes('two') ? Promise.reject(new Error('fail')) : Promise.resolve(`cached-${url}`),
    );

    const tracks = [
      { id: '1', audioUrl: 'one.mp3', title: 'one' },
      { id: '2', audioUrl: 'two.mp3', title: 'two' },
    ];

    const { result } = renderHook(() => useAudioPlayer());

    const processed = await result.current.actions.prefetchTracks(tracks);

    expect(processed[0].audioUrl).toBe('cached-one.mp3');
    expect(processed[1].audioUrl).toBe('two.mp3');
    expect(audioCache.getAudio).toHaveBeenCalledTimes(2);
  });

  test('resolves even when cache rejects', async () => {
    (audioCache.getAudio as jest.Mock).mockRejectedValue(new Error('fail'));

    const tracks = [{ id: '1', audioUrl: 'one.mp3', title: 'one' }];

    const { result } = renderHook(() => useAudioPlayer());

    await expect(result.current.actions.prefetchTracks(tracks)).resolves.toEqual(tracks);
  });
});

describe('startEnhancedPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loads valid track, sets loading state and triggers autoplay', async () => {
    mockStatus = { playing: false, isLoaded: true } as any;
    (audioCache.getAudio as jest.Mock).mockResolvedValue('cached-one.mp3');

    const { result } = renderHook(() => useAudioPlayer());
    jest
      .spyOn(result.current.actions, 'prefetchTracks')
      .mockResolvedValue([]);

    const tracks = [{ id: '1', audioUrl: 'one.mp3', title: 'one' }];
    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.actions.startEnhancedPlayback(tracks);
    });
    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    expect(res).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockAudioPlayer.play).toHaveBeenCalled();
  });

  test('returns false and resets state when loading fails', async () => {
    mockStatus = { playing: false, isLoaded: true } as any;
    (audioCache.getAudio as jest.Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useAudioPlayer());
    jest.spyOn(result.current.actions, 'prefetchTracks').mockResolvedValue([]);

    const tracks = [{ id: '1', audioUrl: undefined as any, title: 'bad' }];

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.actions.startEnhancedPlayback(tracks);
    });

    expect(res).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockAudioPlayer.play).not.toHaveBeenCalled();
  });
});

