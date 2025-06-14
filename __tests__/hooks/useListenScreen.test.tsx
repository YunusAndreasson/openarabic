import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

import { useListenScreen } from '../../hooks/listen/useListenScreen';


const readingListItems = [
  {
    user_id: 'user-1',
    article_id: 1,
    category_id: null,
    added_at: '2024-04-01',
    articles: { title: 'A', author: { id: 1, name: 'Auth' }, image_url: '', placeholder: '' },
  },
  {
    user_id: 'user-1',
    article_id: 2,
    category_id: null,
    added_at: '2024-04-02',
    articles: { title: 'B', author: { id: 2, name: 'Auth2' }, image_url: '', placeholder: '' },
  },
  {
    user_id: 'user-1',
    article_id: 1,
    category_id: null,
    added_at: '2024-04-03',
    articles: { title: 'A', author: { id: 1, name: 'Auth' }, image_url: '', placeholder: '' },
  },
];

const enhancedTracks = [
  { id: 'article-1', articleId: 1, audioUrl: 'url1', title: 'A' },
  { id: 'article-2', articleId: 2, audioUrl: 'url2', title: 'B' },
];

import { AUDIO_STATES } from '../../constants/audio';

const mockUseQuery = jest.fn()
  .mockReturnValueOnce({ data: readingListItems, isLoading: false, isFetching: false })
  .mockReturnValueOnce({ data: enhancedTracks, isLoading: false, isFetching: false })
  .mockReturnValue({ data: [], isLoading: false, isFetching: false });

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useQueryClient: () => ({
    getQueryData: () => readingListItems,
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('../../hooks/audio/useAudioPlayer', () => {
  const { AUDIO_STATES } = require('../../constants/audio');
  const startEnhancedPlayback = jest.fn().mockResolvedValue(true);
  const stopPlayback = jest.fn();
  return {
    __esModule: true,
    startEnhancedPlayback,
    stopPlayback,
    useAudioPlayer: () => ({
      duration: 0,
      position: 0,
      metadata: { articleId: null, articleTitle: null },
      audioState: AUDIO_STATES.STOPPED,
      actions: { startEnhancedPlayback, stopPlayback },
    }),
  };
});

jest.mock('../../hooks/audio/useSleepTimer', () => {
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

const mockState = { listen: { customOrder: [2, 1] } };
const mockDispatch = jest.fn();
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

// Extract mocked functions for assertions
const { startTimer, cancelTimer } = require('../../hooks/audio/useSleepTimer');

// Extract mocked functions for assertions
const { startEnhancedPlayback, stopPlayback } = require('../../hooks/audio/useAudioPlayer');

jest.mock('../../hooks/utils/useScreenFocusRefresh', () => ({
  useScreenFocusRefresh: () => ({ refreshData: jest.fn() }),
}));

jest.mock('../../utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../services/readingList', () => ({
  readingListService: {
    getReadingList: jest.fn().mockResolvedValue(readingListItems),
    removeFromReadingList: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/enhancedAudioService', () => ({
  enhancedAudioService: {
    getReadingListEnhancedTracks: jest.fn().mockResolvedValue(enhancedTracks),
    generateEnhancedAudioTrack: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;


describe('useListenScreen', () => {
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
});
