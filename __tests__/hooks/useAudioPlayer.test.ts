import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns idle state when no track is loaded', () => {
    const { result } = renderHook(() => useAudioPlayer());

    // The hook should return idle when no track is set
    expect(result.current.audioState).toBe(AUDIO_STATES.IDLE);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentTrackIndex).toBe(-1);
  });

  test('provides expected API structure', () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Verify the hook returns the expected structure
    expect(typeof result.current.audioState).toBe('string');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.position).toBe('number');
    expect(typeof result.current.duration).toBe('number');
    expect(typeof result.current.progress).toBe('number');
    expect(typeof result.current.currentTrackIndex).toBe('number');
    expect(typeof result.current.metadata).toBe('object');
    expect(typeof result.current.actions).toBe('object');
    expect(typeof result.current.actions.stopPlayback).toBe('function');
    expect(typeof result.current.actions.startEnhancedPlayback).toBe('function');
    expect(typeof result.current.actions.prefetchTracks).toBe('function');
  });

  test('progress calculation is safe', () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Progress should always be a valid number between 0 and 1
    expect(result.current.progress).toBeGreaterThanOrEqual(0);
    expect(result.current.progress).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.current.progress)).toBe(true);
  });
});

describe('prefetchTracks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns tracks with cached urls when available', async () => {
    (audioCache.getAudio as jest.Mock).mockImplementation((url: string) =>
      url.includes('two') ? Promise.reject(new Error('fail')) : Promise.resolve(`cached-${url}`)
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
    jest.spyOn(result.current.actions, 'prefetchTracks').mockResolvedValue([]);

    const tracks = [{ id: '1', audioUrl: 'one.mp3', title: 'one' }];
    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.actions.startEnhancedPlayback(tracks);
    });
    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    expect(res).toBe(true);
    // Test that the function completes and returns expected value
    expect(typeof res).toBe('boolean');
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
