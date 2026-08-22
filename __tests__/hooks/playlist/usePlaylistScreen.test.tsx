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

// Mock useAppPreloader
const mockPrefetchArticle = jest.fn();
jest.mock('@/hooks/app/useAppPreloader', () => ({
  useAppPreloader: () => ({ prefetchArticle: mockPrefetchArticle }),
}));

// Mock useToast
const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock services - define inline to avoid hoisting issues
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn((..._args: unknown[]) => ({ playing: false, currentUrl: null })),
    stop: jest.fn(async (..._args: unknown[]) => undefined),
    play: jest.fn(async (..._args: unknown[]) => true),
    playPlaylist: jest.fn(async (..._args: unknown[]) => true),
  },
}));

// Get reference to mock for test manipulation
import { simpleAudioService as mockSimpleAudioService } from '@/services/audioPlayer';

jest.mock('@/services/audioPlaylist', () => ({
  enhancedAudioService: {
    getReadingListEnhancedTracks: jest.fn(),
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
  getCurrentArticleId: jest.fn((..._args: unknown[]) => null),
  isAudioBusy: jest.fn((..._args: unknown[]) => false),
  prefetchArticleWithImage: jest.fn(),
  stopNonPlaylistAudioSafely: jest.fn(),
}));

jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingStep: jest.fn(),
}));

// Mock constants
jest.mock('@/constants/animation', () => ({
  DEFAULT_TOAST_DURATION: 3000,
  TIMING_CONSTANTS: { QUICK_DELAY: 100 },
}));

jest.mock('@/constants/strings', () => ({
  STRINGS: {
    PLAYING_ARABIC_ONLY_THIS_SESSION: 'Playing Arabic only this session',
  },
}));

// Mock queries
jest.mock('@/constants/queries', () => ({
  readingProgressQueries: {
    readingList: (userId: string) => ({
      queryKey: ['readingList', userId],
      queryFn: async () => [],
      staleTime: Infinity,
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
    jest.clearAllMocks();
    const { getCurrentArticleId, isAudioBusy } = require('@/utils/audioUtils');
    jest.mocked(getCurrentArticleId).mockReturnValue(null);
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
    jest.mocked(mockSimpleAudioService.stop).mockResolvedValue(undefined);
    jest.mocked(mockSimpleAudioService.play).mockResolvedValue(true);
    jest.mocked(mockSimpleAudioService.playPlaylist).mockResolvedValue(true);
    jest.mocked(mockEnhancedAudioService.getReadingListEnhancedTracks).mockResolvedValue([]);
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
      expect(result.current.sortedEnhancedTracks).toEqual([]);
      expect(result.current.playbackMode).toBe('none');
      expect(result.current.isReadingListLoading).toBeDefined();
    });

    test('provides all required handlers', () => {
      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.handlePlayAll).toBe('function');
      expect(typeof result.current.handlePlayAllArabicOnly).toBe('function');
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
  // PLAY ALL TESTS
  // ============================================================================

  describe('handlePlayAll', () => {
    test('does nothing when audio is busy', async () => {
      const { isAudioBusy } = require('@/utils/audioUtils');
      jest.mocked(isAudioBusy).mockReturnValue(true);

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handlePlayAll();
      });

      expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
    });

    test('stops playback when already playing all', async () => {
      const tracks = [createEnhancedAudioTrackMock({ articleId: 1 as ArticleId })];
      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handlePlayAll();
      });
      expect(result.current.playbackMode).toBe('all');

      jest
        .mocked(mockSimpleAudioService.getStatus)
        .mockReturnValue(createAudioStatusMock({ playing: true }));

      await act(async () => {
        await result.current.handlePlayAll();
      });

      expect(mockSimpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    test('starts playlist playback when tracks available', async () => {
      const tracks = [
        createEnhancedAudioTrackMock({ articleId: 1 as ArticleId, title: 'Track 1' }),
        createEnhancedAudioTrackMock({ articleId: 2 as ArticleId, title: 'Track 2' }),
      ];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(2);
      });

      await act(async () => {
        await result.current.handlePlayAll();
      });

      expect(mockSimpleAudioService.playPlaylist).toHaveBeenCalled();
    });

    test('tracks analytics event when starting playback', async () => {
      const { analytics } = require('@/services/analytics');
      const tracks = [createEnhancedAudioTrackMock({ articleId: 1 as ArticleId })];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(1);
      });

      await act(async () => {
        await result.current.handlePlayAll();
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'Audio Play All Started',
        expect.objectContaining({
          article_count: 1,
          source: 'listen_tab',
        }),
      );
    });
  });

  // ============================================================================
  // ARABIC ONLY PLAYBACK TESTS
  // ============================================================================

  describe('handlePlayAllArabicOnly', () => {
    test('shows a toast but does not start an empty Arabic-only playlist', async () => {
      const tracks = [createEnhancedAudioTrackMock({ articleId: 1 as ArticleId })];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(1);
      });

      await act(async () => {
        await result.current.handlePlayAllArabicOnly();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Playing Arabic only this session',
        expect.any(Number),
        expect.any(String),
        'bottom',
      );
      expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
      const { analytics } = require('@/services/analytics');
      expect(analytics.track).not.toHaveBeenCalled();
      expect(result.current.playbackMode).toBe('none');
    });

    test('triggers haptic feedback', async () => {
      const { mediumFeedback } = require('@/utils/haptics');
      const tracks = [createEnhancedAudioTrackMock({ articleId: 1 as ArticleId })];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(1);
      });

      await act(async () => {
        await result.current.handlePlayAllArabicOnly();
      });

      expect(mediumFeedback).toHaveBeenCalled();
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
      const { getCurrentArticleId } = require('@/utils/audioUtils');

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      // Audio can start through the global mini-player without causing this
      // screen hook to render, so the handler must consult live service state.
      jest.mocked(getCurrentArticleId).mockReturnValue(1);
      jest
        .mocked(mockSimpleAudioService.getStatus)
        .mockReturnValue(createAudioStatusMock({ playing: true }));

      await act(async () => {
        await result.current.handleArticlePlay(1 as ArticleId);
      });

      expect(mockSimpleAudioService.stop).toHaveBeenCalled();
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

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleArticlePlay(2 as ArticleId);
      });

      const playedTracks = jest.mocked(mockSimpleAudioService.playPlaylist).mock.calls[0][0];
      expect(playedTracks.map(track => track.articleId)).toEqual([2, 3]);
    });

    test('resets playback state when fallback track generation fails', async () => {
      const tracks = [createEnhancedAudioTrackMock({ articleId: 1 as ArticleId })];

      queryClient.setQueryData(
        ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
        tracks,
      );

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.sortedEnhancedTracks.length).toBe(1);
      });

      // Try to play article 99 which is not in the list
      await act(async () => {
        await result.current.handleArticlePlay(99 as ArticleId);
      });

      expect(mockEnhancedAudioService.generateEnhancedAudioTrack).toHaveBeenCalledWith(
        articleId(99),
        AudioLanguage.ARABIC_ONLY,
      );
      expect(mockSimpleAudioService.play).not.toHaveBeenCalled();
      expect(result.current.playbackMode).toBe('none');

      const fallbackTrack = createEnhancedAudioTrackMock({ articleId: 100 as ArticleId });
      jest
        .mocked(mockEnhancedAudioService.generateEnhancedAudioTrack)
        .mockResolvedValueOnce(fallbackTrack);
      jest.mocked(mockSimpleAudioService.play).mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.handleArticlePlay(100 as ArticleId);
      });

      const { markOnboardingStep } = require('@/utils/onboardingStorage');
      expect(mockSimpleAudioService.play).toHaveBeenCalledWith(fallbackTrack);
      expect(markOnboardingStep).not.toHaveBeenCalled();
      expect(result.current.playbackMode).toBe('none');
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

    test('invalidates reading list queries', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => usePlaylistScreen(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleDelete(1 as ArticleId);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
      expect(invalidateQueriesSpy).toHaveBeenNthCalledWith(1, {
        queryKey: ['readingList', mockUser.id],
      });
      expect(invalidateQueriesSpy).toHaveBeenNthCalledWith(2, {
        queryKey: ['enhancedAudioTracks', mockUser.id, AudioLanguage.ARABIC_ONLY],
      });
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
