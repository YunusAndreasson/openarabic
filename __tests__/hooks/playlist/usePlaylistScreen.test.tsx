/**
 * usePlaylistScreen Hook Tests
 *
 * Tests the playlist screen hook which manages:
 * - Reading list data loading and sorting
 * - Audio playback (Play All, single article play)
 * - Article deletion from reading list
 * - Playlist state management
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { setupTestStore } from '@/__tests__/helpers/testStore';
import { articleId } from '@/__tests__/helpers/ids';
import {
  createEnhancedAudioTrackMock,
  createReadingListMock,
} from '@/__tests__/helpers/serviceMocks';
import type { ArticleId } from '@/types/branded.types';
import { AudioLanguage } from '@/types/enums';

const mockDispatch = jest.fn();
let mockReduxState = setupTestStore().getState();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockReduxState) => unknown) => selector(mockReduxState),
  useAppSelectorShallow: (selector: (state: typeof mockReduxState) => unknown) =>
    selector(mockReduxState),
}));

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock useAuth
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock services - define inline to avoid hoisting issues
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn((..._args: unknown[]) => ({ playing: false, currentUrl: null })),
    stop: jest.fn(async (..._args: unknown[]) => true),
    play: jest.fn(async (..._args: unknown[]) => true),
    playPlaylist: jest.fn(async (..._args: unknown[]) => true),
  },
}));

// Get reference to mock for test manipulation
import { simpleAudioService as mockSimpleAudioService } from '@/services/audioPlayer';

jest.mock('@/services/audioPlaylist', () => ({
  enhancedAudioService: {
    generateEnhancedAudioTrack: jest.fn(),
  },
  warmTrackCache: jest.fn(),
}));
import { enhancedAudioService as mockEnhancedAudioService } from '@/services/audioPlaylist';

jest.mock('@/services/bookmark', () => ({
  bookmarkService: {
    removeFromReadingList: jest.fn(),
  },
}));
import { bookmarkService as mockBookmarkService } from '@/services/bookmark';

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

// The delete goes through the reading-list mutation hook, which reads the toast.
jest.mock('@/components/providers', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Mock error handling
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// Mock audio utils
jest.mock('@/utils/audioUtils', () => ({
  isAudioBusy: jest.fn((..._args: unknown[]) => false),
  prefetchArticleWithImage: jest.fn(),
  stopNonPlaylistAudioSafely: jest.fn(),
}));

jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingStep: jest.fn(),
}));

// Mock constants
jest.mock('@/constants/animation', () => ({
  TIMING_CONSTANTS: { QUICK_DELAY: 100 },
}));

// Mock queries
const mockFetchReadingList = jest.fn(async (): Promise<unknown[]> => []);
jest.mock('@/constants/queries', () => ({
  // The real one: whether the queries run without a user is part of it.
  gated: (...args: Parameters<typeof import('@/constants/queries').gated>) =>
    jest.requireActual<typeof import('@/constants/queries')>('@/constants/queries').gated(...args),
  readingProgressQueries: {
    // The real one: what a delete refreshes is part of what is under test.
    onListChanged: (...args: unknown[]) =>
      jest
        .requireActual<typeof import('@/constants/queries')>('@/constants/queries')
        .readingProgressQueries.onListChanged(...(args as [QueryClient, string])),
    // Mirrors the real factory's `placeholderData: []`. Without it this mock
    // never had the state the app has — v5 reporting success before the first
    // fetch — and the loading test passed while the screen showed a false
    // "empty playlist".
    readingList: (userId: string) => ({
      queryKey: ['readingList', userId],
      queryFn: () => mockFetchReadingList(),
      staleTime: Infinity,
      placeholderData: [],
      retry: false,
    }),
    keys: {
      readingList: (userId: string) => ['readingList', userId],
    },
  },
  audioQueries: {
    tracks: (userId: string, preference: AudioLanguage) => ({
      queryKey: ['enhancedAudioTracks', userId, preference],
      queryFn: async () => [],
      staleTime: Infinity,
    }),
    keys: {
      tracks: (userId: string, preference: AudioLanguage) => [
        'enhancedAudioTracks',
        userId,
        preference,
      ],
    },
  },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  };
});

// Import hook after mocks
import { usePlaylistScreen } from '@/hooks/playlist/usePlaylistScreen';
import { createAudioStatusMock } from '@/__tests__/helpers/serviceMocks';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('usePlaylistScreen', () => {
  let queryClient: QueryClient;
  let store: ReturnType<typeof setupTestStore>;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Provider>
      );
    };
  };

  beforeEach(() => {
    // resetMocks strips the implementation before every test.
    mockFetchReadingList.mockImplementation(async () => []);
    jest.clearAllMocks();
    const { isAudioBusy } = require('@/utils/audioUtils');
    jest.mocked(isAudioBusy).mockReturnValue(false);
    // Don't use fake timers globally - they conflict with waitFor and async operations
    queryClient = createTestQueryClient();
    store = setupTestStore({
      playlist: {
        customOrder: [],
      },
      settings: {
        audioLanguagePreference: AudioLanguage.ARABIC_ONLY,
        audioShuffleEnabled: false,
        reminderTime: { enabled: false, hour: 9, minute: 0 },
        arabicFontSize: 28,
        arabicFont: 'NotoSansArabic-Regular',
      },
    });
    mockReduxState = store.getState();

    // Reset service mocks
    jest
      .mocked(mockSimpleAudioService.getStatus)
      .mockReturnValue(createAudioStatusMock({ playing: false }));
    jest.mocked(mockSimpleAudioService.stop).mockResolvedValue(true);
    jest.mocked(mockSimpleAudioService.play).mockResolvedValue(true);
    jest.mocked(mockSimpleAudioService.playPlaylist).mockResolvedValue(true);
    jest.mocked(mockEnhancedAudioService.generateEnhancedAudioTrack).mockResolvedValue(null);
    jest.mocked(mockBookmarkService.removeFromReadingList).mockResolvedValue(undefined);
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    test('returns initial state with empty data', () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sortedReadingList).toEqual([]);
      expect(result.current.isReadingListLoading).toBeDefined();
    });

    test('provides all required handlers', () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.handleArticlePlay).toBe('function');
      expect(typeof result.current.handleDelete).toBe('function');
    });
  });

  // ============================================================================
  // READING LIST SORTING TESTS
  // ============================================================================

  describe('Reading List Sorting', () => {
    test('deduplicates articles with same ID', async () => {
      const readingList = [
        createReadingListMock({ article_id: 1, added_at: '2024-01-01T00:00:00Z' }),
        createReadingListMock({ article_id: 1, added_at: '2024-01-02T00:00:00Z' }), // Duplicate
        createReadingListMock({ article_id: 2, added_at: '2024-01-03T00:00:00Z' }),
      ];

      queryClient.setQueryData(['readingList', mockUser.id], readingList);

      expect(store.getState().playlist.customOrder).toEqual([]);
      expect(store.getState().settings.audioLanguagePreference).toBe(AudioLanguage.ARABIC_ONLY);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(result.current.sortedReadingList.map(item => item.article_id)).toEqual([2, 1]),
      );
    });

    test('sorts by custom order when available', async () => {
      const readingList = [
        createReadingListMock({ article_id: 1, added_at: '2024-01-01T00:00:00Z' }),
        createReadingListMock({ article_id: 2, added_at: '2024-01-02T00:00:00Z' }),
        createReadingListMock({ article_id: 3, added_at: '2024-01-03T00:00:00Z' }),
      ];

      // Custom order: 3, 1, 2
      store = setupTestStore({
        playlist: {
          customOrder: [3, 1, 2],
        },
        settings: {
          audioLanguagePreference: AudioLanguage.ARABIC_ONLY,
          audioShuffleEnabled: false,
          reminderTime: { enabled: false, hour: 9, minute: 0 },
          arabicFontSize: 28,
          arabicFont: 'NotoSansArabic-Regular',
        },
      });
      mockReduxState = store.getState();

      queryClient.setQueryData(['readingList', mockUser.id], readingList);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedReadingList.length).toBe(3);
      });

      expect(result.current.sortedReadingList.map(item => item.article_id)).toEqual([3, 1, 2]);
    });
  });

  // ============================================================================
  // SINGLE ARTICLE PLAY TESTS
  // ============================================================================

  describe('handleArticlePlay', () => {
    test('does nothing when audio is busy', async () => {
      const { isAudioBusy } = require('@/utils/audioUtils');
      jest.mocked(isAudioBusy).mockReturnValue(true);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleArticlePlay(1 as ArticleId);
      });

      expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
    });

    test('stops playback when tapping currently playing article', async () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      // Audio can start through the global mini-player without causing this
      // screen hook to render, so the handler must consult live service state.
      jest.mocked(mockSimpleAudioService.getStatus).mockReturnValue(
        createAudioStatusMock({
          playing: true,
          currentTrack: createEnhancedAudioTrackMock({ articleId: 1 as ArticleId }),
        }),
      );

      await act(async () => {
        await result.current.handleArticlePlay(1 as ArticleId);
      });

      expect(mockSimpleAudioService.stop).toHaveBeenCalled();
      expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
    });

    test('plays from article position (Spotify-style)', async () => {
      const tracks = [
        createEnhancedAudioTrackMock({ articleId: 1 as ArticleId, title: 'Track 1' }),
        createEnhancedAudioTrackMock({ articleId: 2 as ArticleId, title: 'Track 2' }),
        createEnhancedAudioTrackMock({ articleId: 3 as ArticleId, title: 'Track 3' }),
      ];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleArticlePlay(2 as ArticleId);
      });

      const [playedTracks = [], onAdvance] =
        jest.mocked(mockSimpleAudioService.playPlaylist).mock.calls[0] ?? [];
      expect(playedTracks.map(track => track.articleId)).toEqual([2, 3]);
      // The shared start path: the queue warms each track as it comes up.
      expect(onAdvance).toEqual(expect.any(Function));

      const { analytics } = require('@/services/analytics');
      expect(analytics.track).toHaveBeenCalledWith(
        'Audio Playback Started',
        expect.objectContaining({
          article_id: 2,
          source: 'playlist_row',
          playlist_position: 2,
          playlist_total: 3,
        }),
      );
    });

    test('an article the tracks have not caught up with plays from the list, as a queue', async () => {
      // Saved a moment ago: on the list, not yet among the tracks.
      const listArticle = {
        title: 'Just Saved',
        image_url: 'just-saved.jpg',
        audio_url: 'just-saved.mp3',
        author: { name: 'Author' },
      };
      queryClient.setQueryData(
        ['readingList', mockUser.id],
        [{ ...createReadingListMock({ article_id: 100 }), articles: listArticle }],
      );
      const fallbackTrack = createEnhancedAudioTrackMock({ articleId: 100 as ArticleId });
      jest
        .mocked(mockEnhancedAudioService.generateEnhancedAudioTrack)
        .mockResolvedValueOnce(fallbackTrack);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleArticlePlay(100 as ArticleId);
      });

      // The list's own copy of the article, rather than a download of it.
      expect(mockEnhancedAudioService.generateEnhancedAudioTrack).toHaveBeenCalledWith(
        articleId(100),
        AudioLanguage.ARABIC_ONLY,
        expect.objectContaining({ title: 'Just Saved' }),
      );
      // A queue of one, so it gets the lock screen and survives backgrounding.
      expect(mockSimpleAudioService.playPlaylist).toHaveBeenCalledWith(
        [fallbackTrack],
        expect.any(Function),
      );
      expect(mockSimpleAudioService.play).not.toHaveBeenCalled();
      const { markOnboardingStep } = require('@/utils/onboardingStorage');
      expect(markOnboardingStep).toHaveBeenCalled();
    });

    test('plays nothing when the fallback track cannot be built', async () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleArticlePlay(99 as ArticleId);
      });

      expect(mockEnhancedAudioService.generateEnhancedAudioTrack).toHaveBeenCalledWith(
        articleId(99),
        AudioLanguage.ARABIC_ONLY,
        undefined,
      );
      expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
      expect(mockSimpleAudioService.play).not.toHaveBeenCalled();
    });

    test('a start that fails marks nothing', async () => {
      const fallbackTrack = createEnhancedAudioTrackMock({ articleId: 100 as ArticleId });
      jest
        .mocked(mockEnhancedAudioService.generateEnhancedAudioTrack)
        .mockResolvedValueOnce(fallbackTrack);
      jest.mocked(mockSimpleAudioService.playPlaylist).mockResolvedValueOnce(false);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleArticlePlay(100 as ArticleId);
      });

      const { markOnboardingStep } = require('@/utils/onboardingStorage');
      const { warmTrackCache } = require('@/services/audioPlaylist');
      expect(markOnboardingStep).not.toHaveBeenCalled();
      expect(warmTrackCache).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DELETE ARTICLE TESTS
  // ============================================================================

  describe('handleDelete', () => {
    test('removes article from reading list', async () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(mockBookmarkService.removeFromReadingList).toHaveBeenCalledWith(
        mockUser.id,
        articleId(1),
        expect.objectContaining({ managed: true }),
      );
    });

    test('triggers haptic feedback', async () => {
      const { selectionFeedback } = require('@/utils/haptics');

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(selectionFeedback).toHaveBeenCalled();
    });

    test('refreshes the reading list and the tracks of every audio language', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['readingList', mockUser.id],
      });
      // Every language, not just the one playing: the other's tracks were
      // left listing the deleted article.
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['enhancedAudioTracks', mockUser.id],
      });
    });

    test('tracks the removal like the reader does', async () => {
      const { analytics } = require('@/services/analytics');

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'Article Bookmarked',
        expect.objectContaining({ article_id: 1, action: 'remove' }),
      );
    });

    test('handles error gracefully', async () => {
      const { handleError } = require('@/utils/errorHandling');
      jest
        .mocked(mockBookmarkService.removeFromReadingList)
        .mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(handleError).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('Loading States', () => {
    test('shows initial loading when data not cached', () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      expect(result.current.shouldShowInitialLoading).toBe(true);
    });

    test('reports a failed first load instead of an empty playlist', async () => {
      mockFetchReadingList.mockRejectedValueOnce(new Error('offline'));

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.readingListLoadFailed).toBe(true);
      });
      expect(result.current.shouldShowInitialLoading).toBe(false);
      expect(result.current.sortedReadingList).toEqual([]);
    });

    test('hides initial loading when data is cached', async () => {
      const readingList = [createReadingListMock({ article_id: 1 })];

      queryClient.setQueryData(['readingList', mockUser.id], readingList);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.shouldShowInitialLoading).toBeFalsy();
      });
    });
  });

  // ============================================================================
  // CLEANUP TESTS
  // ============================================================================

  describe('Cleanup', () => {
    test('stops non-playlist audio when the screen loses focus', () => {
      const { stopNonPlaylistAudioSafely } = require('@/utils/audioUtils');

      const { unmount } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(stopNonPlaylistAudioSafely).toHaveBeenCalledTimes(1);
    });
  });
});
