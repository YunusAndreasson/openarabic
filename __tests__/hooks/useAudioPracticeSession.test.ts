import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach } from '@jest/globals';

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

let mockAudioState = AUDIO_STATES.IDLE;
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

  it('marks session complete when playback finishes without repeat', () => {
    const { result, rerender } = renderHook(() => useAudioPracticeSession());

    act(() => {
      jest.runAllTimers();
    });

    mockAudioState = AUDIO_STATES.PLAYING;
    rerender();

    mockTrackIndex = tracks.length - 1;
    rerender();

    mockAudioState = AUDIO_STATES.IDLE;
    rerender();

    expect(result.current.isComplete).toBe(true);
  });

  it.each([
    {
      name: 'normal completion',
      states: [
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.IDLE,
      ],
      indices: [0, 1, 2, 3, 3],
      toggleRepeat: false,
      expected: { isComplete: true, progress: 100, repeatEnabled: false },
    },
    {
      name: 'early stop',
      states: [AUDIO_STATES.PLAYING, AUDIO_STATES.IDLE],
      indices: [0, 0],
      toggleRepeat: false,
      expected: { isComplete: true, progress: 50, repeatEnabled: false },
    },
    {
      name: 'repeat mode',
      states: [
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.PLAYING,
        AUDIO_STATES.IDLE,
        AUDIO_STATES.PLAYING,
      ],
      indices: [0, 1, 2, 3, 3, 0],
      toggleRepeat: true,
      expected: { isComplete: false, progress: 50, repeatEnabled: true },
    },
  ])('handles $name scenario', ({ states, indices, toggleRepeat, expected }) => {
    const { result, rerender } = renderHook(() => useAudioPracticeSession());

    if (toggleRepeat) {
      act(() => {
        result.current.handleRepeatToggle();
      });
    }

    act(() => {
      jest.runAllTimers();
    });

    states.forEach((state, idx) => {
      mockAudioState = state;
      mockTrackIndex = indices[idx];
      rerender();

      if (state === AUDIO_STATES.IDLE) {
        act(() => {
          jest.runAllTimers();
        });
        rerender();
      }
    });

    expect(result.current.isComplete).toBe(expected.isComplete);
    expect(result.current.progress).toBe(expected.progress);
    expect(result.current.repeatEnabled).toBe(expected.repeatEnabled);
  });
});
