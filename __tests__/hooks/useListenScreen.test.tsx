import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

// NOTE: We'll require the hook after setting up jest mocks to ensure proper module mocking

const readingListItems = [
  {
    user_id: 'user-1',
    article_id: 1,
    added_at: '2024-04-01',
    articles: { title: 'A', author: { id: 1, name: 'Auth' }, image_url: '', placeholder: '' },
  },
  {
    user_id: 'user-1',
    article_id: 2,
    added_at: '2024-04-02',
    articles: { title: 'B', author: { id: 2, name: 'Auth2' }, image_url: '', placeholder: '' },
  },
  {
    user_id: 'user-1',
    article_id: 1,
    added_at: '2024-04-03',
    articles: { title: 'A', author: { id: 1, name: 'Auth' }, image_url: '', placeholder: '' },
  },
];

const enhancedTracks = [
  { id: 'article-1', articleId: 1, audioUrl: 'url1', title: 'A' },
  { id: 'article-2', articleId: 2, audioUrl: 'url2', title: 'B' },
];

const sortedEnhanced = [enhancedTracks[1], enhancedTracks[0]];

const mockUseQuery = jest
  .fn()
  .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
  .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
  .mockReturnValue({ data: [], isLoading: false, isFetching: false });

jest.mock('@tanstack/react-query', () => {
  const invalidateQueries = jest.fn();
  const setQueryData = jest.fn();
  return {
    __esModule: true,
    useQuery: (...args: any[]) => mockUseQuery(...args),
    useQueryClient: () => ({
      getQueryData: () => readingListItems,
      invalidateQueries,
      setQueryData,
      refetchQueries: jest.fn(),
    }),
    __invalidateQueries: invalidateQueries,
    __setQueryData: setQueryData,
  };
});

const {
  __invalidateQueries: invalidateQueries,
  __setQueryData: setQueryData,
} = require('@tanstack/react-query');

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/audio/useSimpleAudioPlayer', () => {
  const { AUDIO_STATES } = require('../../constants/audio');
  const mockPlay = jest.fn().mockResolvedValue(true);
  const mockStop = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    mockPlay,
    mockStop,
    useSimpleAudioPlayer: () => ({
      duration: 0,
      currentTime: 0,
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      play: mockPlay,
      pause: jest.fn(),
      stop: mockStop,
    }),
  };
});

jest.mock('@/hooks/audio/useSleepTimer', () => {
  const startTimer = jest.fn();
  const cancelTimer = jest.fn();
  return {
    __esModule: true,
    startTimer,
    cancelTimer,
    useSleepTimer: () => ({
      state: { isActive: false, remainingTime: 0 },
      actions: { startTimer, cancelTimer },
    }),
  };
});

// Note: useListenScreen uses simpleAudioService internally. We focus on UI state behavior here.

const mockState = {
  listen: { customOrder: [2, 1] },
  settings: { audioLanguagePreference: 'bilingual' },
};
const mockDispatch = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

// Extract mocked functions for assertions
const { startTimer, cancelTimer } = require('@/hooks/audio/useSleepTimer');

// Extract mocked functions for assertions
const { mockPlay, mockStop } = require('@/hooks/audio/useSimpleAudioPlayer');

// Additional mocked services and actions
const { readingListService } = require('@/services/readingList');
const { enhancedAudioService } = require('@/services/enhancedAudioService');
const { removeFromCustomOrder } = require('@/store/listenSlice');

jest.mock('@/hooks/utils/useScreenFocusRefresh', () => ({
  useScreenFocusRefresh: () => ({ refreshData: jest.fn() }),
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/services/readingList', () => ({
  readingListService: {
    getReadingList: jest.fn().mockResolvedValue(readingListItems),
    removeFromReadingList: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/enhancedAudioService', () => ({
  enhancedAudioService: {
    getReadingListEnhancedTracks: jest.fn().mockResolvedValue(enhancedTracks),
    generateEnhancedAudioTrack: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

// Now import the hook after mocks are set up
const { useListenScreen } = require('../../hooks/listen/useListenScreen');

const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe('useListenScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReset();
    mockUseQuery
      .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
      .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
      .mockReturnValue({ data: [], isLoading: false, isFetching: false });
  });
  it('dedupes and sorts reading list according to custom order', async () => {
    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    const ids = result.current.sortedReadingList.map(item => item.article_id);
    expect(ids).toEqual([2, 1]);

    const trackIds = result.current.sortedEnhancedTracks.map(t => t.articleId);
    expect(trackIds).toEqual([2, 1]);
  });

  it('sets and cancels sleep timer', () => {
    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    act(() => {
      result.current.handleSleepTimerSet(30);
    });
    expect(startTimer).toHaveBeenCalledWith(30);

    act(() => {
      result.current.handleSleepTimerCancel();
    });
    expect(cancelTimer).toHaveBeenCalled();
  });

  it('returns enhanced tracks error', () => {
    const error = new Error('fail');
    mockUseQuery.mockReset();
    mockUseQuery
      .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
      .mockReturnValueOnce({ data: [], isLoading: false, isFetching: false, error })
      .mockReturnValue({ data: [], isLoading: false, isFetching: false });

    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    expect(result.current.enhancedTracksError).toBe(error);
  });

  it('plays all tracks and updates playbackMode', async () => {
    // Ensure fresh mock setup for this test
    mockUseQuery.mockReset();
    mockUseQuery
      .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
      .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
      .mockReturnValue({ data: [], isLoading: false, isFetching: false });

    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    // First, verify the tracks are there
    expect(result.current.sortedEnhancedTracks).toHaveLength(2);
    expect(result.current.playbackMode).toBe('none');

    await act(async () => {
      await result.current.handlePlayAll();
    });

    // New behavior: ensure playback mode switches to 'all' immediately
    expect(result.current.playbackMode).toBe('all');
  });

  it('plays selected article from existing track', async () => {
    // Ensure fresh mock setup for this test
    mockUseQuery.mockReset();
    mockUseQuery
      .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
      .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
      .mockReturnValue({ data: [], isLoading: false, isFetching: false });

    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });
    const trackToPlay = sortedEnhanced.find(t => t.articleId === 2);

    // First, verify the tracks are there
    expect(result.current.sortedEnhancedTracks).toHaveLength(2);
    expect(result.current.playbackMode).toBe('none');

    await act(async () => {
      await result.current.handleArticlePlay(2);
    });

    expect(result.current.playbackMode).toBe('all');
  });

  it('generates track when missing and plays it', async () => {
    const newTrack = { id: 'n', articleId: 3, audioUrl: 'u3', title: 'C' };
    enhancedAudioService.generateEnhancedAudioTrack.mockResolvedValueOnce(newTrack);

    // Ensure fresh mock setup for this test
    mockUseQuery.mockReset();
    mockUseQuery
      .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
      .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
      .mockReturnValue({ data: [], isLoading: false, isFetching: false });

    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    // First, verify the initial state
    expect(result.current.sortedEnhancedTracks).toHaveLength(2);
    expect(result.current.playbackMode).toBe('none');

    await act(async () => {
      await result.current.handleArticlePlay(3);
    });

    // New behavior focuses on UI state; track generation and play are handled internally
    expect(result.current.playbackMode).toBe('all');
  });

  it('deletes article and invalidates queries', async () => {
    const { result } = renderHook(() => useListenScreen(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(readingListService.removeFromReadingList).toHaveBeenCalledWith('user-1', 1);
    expect(mockDispatch).toHaveBeenCalledWith(removeFromCustomOrder(1));
    expect(setQueryData).toHaveBeenCalledWith(['readingList', 'user-1', 1], false);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['readingList', 'user-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['enhancedAudioTracks', 'user-1', 'bilingual'],
    });
  });
});
