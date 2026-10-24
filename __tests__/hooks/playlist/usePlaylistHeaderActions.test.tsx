/**
 * usePlaylistHeaderActions Hook Tests
 *
 * The Playlist tab's header "Play all" — the live way a whole queue starts. It
 * must play what the screen shows (drag order, one track per article) through
 * the same start path as the rest of the app.
 */

import { renderHook, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { setupTestStore } from '@/__tests__/helpers/testStore';
import {
  createEnhancedAudioTrackMock,
  createReadingListMock,
} from '@/__tests__/helpers/serviceMocks';
import { STRINGS } from '@/constants/strings';
import type { SourceTrackedAudioTrack } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId } from '@/types/branded.types';
import { AudioLanguage } from '@/types/enums';

let mockReduxState = setupTestStore().getState();
jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: typeof mockReduxState) => unknown) => selector(mockReduxState),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    playPlaylist: jest.fn(async (..._args: unknown[]) => true),
  },
}));
import { simpleAudioService as mockSimpleAudioService } from '@/services/audioPlayer';

jest.mock('@/services/audioPlaylist', () => ({
  warmTrackCache: jest.fn(),
}));
import { warmTrackCache as mockWarmTrackCache } from '@/services/audioPlaylist';

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn() },
}));
import { analytics as mockAnalytics } from '@/services/analytics';

jest.mock('@/utils/audioUtils', () => ({
  isAudioBusy: jest.fn((..._args: unknown[]) => false),
  prefetchArticleWithImage: jest.fn(),
}));
import {
  isAudioBusy as mockIsAudioBusy,
  prefetchArticleWithImage as mockPrefetchArticleWithImage,
} from '@/utils/audioUtils';

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingStep: jest.fn(),
}));
import { markOnboardingStep as mockMarkOnboardingStep } from '@/utils/onboardingStorage';

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/constants/animation', () => ({
  DEFAULT_TOAST_DURATION: 3000,
}));

// The real query factories pull in every service; these stand in with the
// same keys and the same `placeholderData: []` the app's queries carry.
jest.mock('@/constants/queries', () => ({
  gated: (...args: Parameters<typeof import('@/constants/queries').gated>) =>
    jest.requireActual<typeof import('@/constants/queries')>('@/constants/queries').gated(...args),
  readingProgressQueries: {
    readingList: (userId: string) => ({
      queryKey: ['readingList', userId],
      queryFn: async () => [],
      staleTime: Infinity,
      placeholderData: [],
    }),
  },
  audioQueries: {
    tracks: (userId: string, preference: AudioLanguage) => ({
      queryKey: ['enhancedAudioTracks', userId, preference],
      queryFn: async () => [],
      staleTime: Infinity,
      placeholderData: [],
    }),
  },
}));

import { usePlaylistHeaderActions } from '@/hooks/playlist/usePlaylistHeaderActions';

const USER_ID = 'test-user-id';

const track = (id: number): EnhancedAudioTrack =>
  createEnhancedAudioTrackMock({
    id: `article-${id}`,
    articleId: id as ArticleId,
    title: `Article ${id}`,
  });

describe('usePlaylistHeaderActions', () => {
  let queryClient: QueryClient;

  const renderHeader = () =>
    renderHook(() => usePlaylistHeaderActions(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  /** The reading list (newest first) and the tracks built from it, as cached. */
  const seed = (articleIds: number[], customOrder: number[] = []) => {
    mockReduxState = setupTestStore({
      playlist: { customOrder },
      settings: {
        audioLanguagePreference: AudioLanguage.ARABIC_ONLY,
        audioShuffleEnabled: false,
        reminderTime: { enabled: false, hour: 9, minute: 0 },
        arabicFontSize: 28,
        arabicFont: 'NotoSansArabic-Regular',
      },
    }).getState();
    queryClient.setQueryData(
      ['readingList', USER_ID],
      articleIds.map((id, index) =>
        createReadingListMock({
          article_id: id,
          added_at: new Date(Date.UTC(2024, 0, 31 - index)).toISOString(),
        }),
      ),
    );
    queryClient.setQueryData(
      ['enhancedAudioTracks', USER_ID, AudioLanguage.ARABIC_ONLY],
      articleIds.map(track),
    );
  };

  const playedQueue = (): SourceTrackedAudioTrack[] =>
    jest.mocked(mockSimpleAudioService.playPlaylist).mock.calls[0]?.[0] ?? [];

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    jest.mocked(mockIsAudioBusy).mockReturnValue(false);
    jest.mocked(mockSimpleAudioService.playPlaylist).mockResolvedValue(true);
  });

  test('plays the order the screen shows, not the order the articles were saved', async () => {
    // Saved newest first: 3, 2, 1. Dragged into 2, 3, 1.
    seed([3, 2, 1], [2, 3, 1]);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    expect(playedQueue().map(t => t.articleId)).toEqual([2, 3, 1]);
  });

  test('plays an article saved twice once, as the list shows it', async () => {
    seed([2, 1, 2]);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    expect(playedQueue().map(t => t.articleId)).toEqual([2, 1]);
  });

  test('starts through the shared path: advance warming, then the first track, onboarding and analytics', async () => {
    seed([1, 2]);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    // Play all used to pass no advance callback, so later tracks never warmed.
    const onAdvance = jest.mocked(mockSimpleAudioService.playPlaylist).mock.calls[0]?.[1];
    expect(onAdvance).toEqual(expect.any(Function));
    const [first] = playedQueue();
    expect(mockWarmTrackCache).toHaveBeenCalledWith(first);
    expect(mockMarkOnboardingStep).toHaveBeenCalled();
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'Audio Play All Started',
      expect.objectContaining({ article_count: 2, source: 'header_button' }),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'Audio Playback Started',
      expect.objectContaining({ source: 'header_button', playlist_total: 2 }),
    );

    // Each advance warms the track that has just started, and its artwork.
    jest.mocked(mockWarmTrackCache).mockClear();
    const next = track(2);
    onAdvance?.(next);
    expect(mockWarmTrackCache).toHaveBeenCalledWith(next);
    expect(mockPrefetchArticleWithImage).toHaveBeenCalledWith(next, queryClient);
  });

  test('says there is nothing to play when the list is empty', async () => {
    seed([]);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      STRINGS.PLAY_ALL_NOTHING_TO_PLAY,
      expect.any(Number),
      expect.anything(),
    );
  });

  test('does nothing while audio is still loading', async () => {
    seed([1, 2]);
    jest.mocked(mockIsAudioBusy).mockReturnValue(true);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    expect(mockSimpleAudioService.playPlaylist).not.toHaveBeenCalled();
  });

  test('a start that fails comes back down without marking anything', async () => {
    seed([1, 2]);
    jest.mocked(mockSimpleAudioService.playPlaylist).mockResolvedValueOnce(false);
    const { result } = renderHeader();

    await act(async () => {
      await result.current.handlePlayAll();
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockMarkOnboardingStep).not.toHaveBeenCalled();
    expect(mockWarmTrackCache).not.toHaveBeenCalled();
  });
});
