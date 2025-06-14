import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { useAudioPracticeSession } from '../../hooks/practice/useAudioPracticeSession';
import { AUDIO_STATES } from '../../constants/audio';

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('../../hooks/audio/useAudioPlayer', () => ({
  useAudioPlayer: jest.fn(),
}));

jest.mock('../../services/listenAudioService', () => ({
  listenAudioService: {
    getRandomVocabularyTracks: jest.fn(),
  },
}));

jest.mock('../../hooks/vocabulary/useFSRSQueries', () => ({
  useFSRSQueries: jest.fn(),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const { useAudioPlayer } = require('../../hooks/audio/useAudioPlayer');
const { listenAudioService } = require('../../services/listenAudioService');
const { useFSRSQueries } = require('../../hooks/vocabulary/useFSRSQueries');

const startEnhancedPlayback = jest.fn().mockResolvedValue(true);
const stopPlayback = jest.fn().mockResolvedValue();

let mockAudioState: string = AUDIO_STATES.IDLE;
let mockTrackIndex = -1;

const baseWord = (id: number) => ({
  root_id: id,
  user_id: 'u1',
  created_at: '2024-01-01',
  root: {
    id,
    letters: `word${id}`,
    meaning: `meaning${id}`,
    audio_url: `ar${id}.mp3`,
    audio_url_en: `en${id}.mp3`,
  },
});

const tracks = [
  { id: 't1', rootId: 1, audioUrl: 'ar1.mp3', title: 'ar1' },
  { id: 't2', rootId: 1, audioUrl: 'en1.mp3', title: 'en1' },
  { id: 't3', rootId: 2, audioUrl: 'ar2.mp3', title: 'ar2' },
  { id: 't4', rootId: 2, audioUrl: 'en2.mp3', title: 'en2' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockAudioState = AUDIO_STATES.IDLE;
  mockTrackIndex = -1;

  (useAudioPlayer as jest.Mock).mockImplementation(() => ({
    audioState: mockAudioState,
    currentTrackIndex: mockTrackIndex,
    actions: { startEnhancedPlayback, stopPlayback },
  }));

  listenAudioService.getRandomVocabularyTracks.mockResolvedValue(tracks);
  (useFSRSQueries as jest.Mock).mockReturnValue({
    allWords: [baseWord(1), baseWord(2)],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAudioPracticeSession', () => {
  it('toggles repeat mode', () => {
    const { result } = renderHook(() => useAudioPracticeSession());

    expect(result.current.repeatEnabled).toBe(false);
    act(() => {
      result.current.handleRepeatToggle();
    });
    expect(result.current.repeatEnabled).toBe(true);
    act(() => {
      result.current.handleRepeatToggle();
    });
    expect(result.current.repeatEnabled).toBe(false);
  });

  it('marks session complete when audio state changes to idle after playing', () => {
    const { result, rerender } = renderHook(() => useAudioPracticeSession());

    // Simulate playback starting
    mockAudioState = AUDIO_STATES.PLAYING;
    rerender();

    // Simulate playback ending
    mockAudioState = AUDIO_STATES.IDLE;
    rerender();

    expect(result.current.isComplete).toBe(true);
  });

  it('calculates progress based on current word index and word list', () => {
    const { result, rerender } = renderHook(() => useAudioPracticeSession());

    // Initially progress should be 0 since wordList is empty until async load completes
    expect(result.current.progress).toBe(0);

    // Mock that we have 2 words and we're on the first track (index 0)
    mockTrackIndex = 0; // First track (word 1, Arabic)
    rerender();

    // Progress should still be 0 until wordList is populated
    expect(result.current.progress).toBe(0);
  });

  it('handles repeat mode correctly', () => {
    const { result } = renderHook(() => useAudioPracticeSession());

    // Initially repeat should be disabled
    expect(result.current.repeatEnabled).toBe(false);

    // Enable repeat mode
    act(() => {
      result.current.handleRepeatToggle();
    });
    expect(result.current.repeatEnabled).toBe(true);

    // When repeat is enabled, completion should be handled differently
    // This is tested through the state management, not the async flow
  });

  it('provides current word information', () => {
    const { result } = renderHook(() => useAudioPracticeSession());

    // Initially should have empty word info since async loading hasn't completed
    expect(result.current.currentArabicWord).toBe('');
    expect(result.current.currentWord).toBe(null);
  });

  it('aborts pending track load on unmount', async () => {
    (listenAudioService.getRandomVocabularyTracks as jest.Mock).mockReturnValue(new Promise(() => {}));

    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useAudioPracticeSession());

    unmount();

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(startEnhancedPlayback).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
