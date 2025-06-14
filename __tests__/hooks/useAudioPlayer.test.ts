import { renderHook } from '@testing-library/react-native';
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

// Import after mocking
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
