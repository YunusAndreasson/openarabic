import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { audioQueries, readingProgressQueries } from '@/constants/queries';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
// Use direct service access to avoid frequent parent re-renders from time updates
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import { enhancedAudioService } from '@/services/audioPlaylist';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/playlistSlice';
import type { ArticleId } from '@/types/branded.types';
import {
  getCurrentArticleId,
  isAudioBusy,
  prefetchArticleWithImage,
  stopAudioSafely,
} from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { shuffleArray } from '@/utils/list';

/**
 * Official React Query pattern for refetching on screen focus
 * Skips the first focus (mount) and refetches on subsequent focuses
 * Automatically respects query's staleTime configuration
 */
function useRefreshOnFocus<T>(refetch: () => Promise<T>) {
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

export const useBookmarksScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { prefetchArticle } = useAppPreloader();

  const customOrder = useAppSelector(state => state.playlist.customOrder);
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
  const audioShuffleEnabled = useAppSelector(state => state.settings.audioShuffleEnabled);

  // STABILIZATION: Add debouncing for playback mode changes
  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');
  const playbackModeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sleep timer functionality is handled by useGlobalAudioState

  const readingListQuery = useQuery({
    queryKey: user?.id ? readingProgressQueries.keys.readingList(user.id) : ['readingList', 'none'],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return bookmarkService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
    gcTime: 10 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
    retry: 2,
    retryDelay: attemptIndex =>
      Math.min(TIMING_CONSTANTS.RETRY_DELAY_BASE * 2 ** attemptIndex, TIMING_CONSTANTS.LONG_DELAY),
    placeholderData: [],
  });
  const { data: readingList = [], isLoading: isReadingListLoading } = readingListQuery;

  const sortedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    // Deduplicate while preserving order
    const seen = new Set<number>();
    const deduped = readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });

    // Sort the already-deduped array (no spread needed since filter returns new array)
    if (customOrder.length > 0) {
      const customOrderMap = new Map(customOrder.map((id, index) => [id, index]));
      return deduped.sort((a, b) => {
        const posA = customOrderMap.get(a.article_id) ?? 999;
        const posB = customOrderMap.get(b.article_id) ?? 999;

        if (posA !== 999 && posB !== 999) {
          return posA - posB;
        }

        if (posA !== 999) return -1;
        if (posB !== 999) return 1;

        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      });
    }

    return deduped.sort((a, b) => {
      const dateA = new Date(a.added_at).getTime();
      const dateB = new Date(b.added_at).getTime();
      return dateB - dateA;
    });
  }, [readingList, customOrder]);

  const isDataCached = useMemo(() => {
    return Boolean(user?.id && queryClient.getQueryData(['readingList', user.id]));
  }, [user?.id, queryClient]);

  const enhancedTracksQuery = useQuery({
    queryKey: user?.id
      ? audioQueries.keys.tracks(user.id, audioPreference)
      : ['enhancedAudioTracks', 'none'],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id, audioPreference);
    },
    enabled: !!user?.id,
    staleTime: 5 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND, // Standard stale time is fine now
    gcTime: 10 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
    placeholderData: [],
  });
  const { data: enhancedTracks = [], error: enhancedTracksError } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    const articlePositionMap = new Map(
      sortedReadingList.map((item, index) => [item.article_id, index]),
    );

    return [...enhancedTracks].sort((a, b) => {
      const posA = a.articleId ? (articlePositionMap.get(a.articleId) ?? 999) : 999;
      const posB = b.articleId ? (articlePositionMap.get(b.articleId) ?? 999) : 999;
      return posA - posB;
    });
  }, [enhancedTracks, sortedReadingList]);

  const shouldShowInitialLoading = useMemo(() => {
    return !isDataCached && isReadingListLoading && sortedReadingList.length === 0;
  }, [isDataCached, isReadingListLoading, sortedReadingList.length]);

  // Refetch on screen focus using official React Query pattern
  // Automatically respects staleTime (5 minutes) - no manual throttling needed
  useRefreshOnFocus(readingListQuery.refetch);
  useRefreshOnFocus(enhancedTracksQuery.refetch);

  const isCurrentlyPlaying = simpleAudioService.getStatus().isPlaying;

  // STABILIZATION: Enhanced handlePlayAll with better state management
  const handlePlayAll = useCallback(async () => {
    // Clear playback mode timeout
    if (playbackModeTimeoutRef.current) {
      clearTimeout(playbackModeTimeoutRef.current);
    }

    // Get current values directly from audio service instead of relying on local state
    const currentStatus = simpleAudioService.getStatus();
    const currentPlaybackMode = playbackMode;
    const currentTracks = sortedEnhancedTracks;

    const isCurrentlyPlayingNow = currentStatus.isPlaying;

    if (isAudioBusy()) {
      return;
    }

    if (isCurrentlyPlayingNow && currentPlaybackMode === 'all') {
      try {
        selectionFeedback();
        await simpleAudioService.stop();
        // STABILIZATION: Debounce playback mode change
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, TIMING_CONSTANTS.QUICK_DELAY);
      } catch {
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, TIMING_CONSTANTS.QUICK_DELAY);
      }
    } else if (currentTracks.length) {
      try {
        selectionFeedback();
        // STABILIZATION: Set playback mode immediately for UI feedback
        setPlaybackMode('all');

        // Track Play All started
        analytics.track(ANALYTICS_EVENTS.AUDIO_PLAY_ALL_STARTED, {
          article_count: currentTracks.length,
          source: 'listen_tab',
          shuffle_enabled: audioShuffleEnabled,
        });

        // PLAYLIST SUPPORT: Use the new playlist functionality instead of just playing the first track
        const tracksToPlay = audioShuffleEnabled ? shuffleArray(currentTracks) : currentTracks;

        const success = await simpleAudioService.playPlaylist(tracksToPlay, nextTrack => {
          // Callback when a track completes and the next one starts
          if (nextTrack?.articleId) {
            // Prefetch the next article's data and image for smooth transitions
            prefetchArticleWithImage(nextTrack.articleId, queryClient, prefetchArticle);
          } else {
            // Playlist is complete, reset playback mode
            playbackModeTimeoutRef.current = setTimeout(() => {
              setPlaybackMode('none');
            }, TIMING_CONSTANTS.QUICK_DELAY);
          }
        });

        if (!success) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, TIMING_CONSTANTS.QUICK_DELAY);
        }
      } catch (error) {
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, TIMING_CONSTANTS.QUICK_DELAY);
        handleError(error as Error);
      }
    }
  }, [playbackMode, sortedEnhancedTracks, audioPreference, audioShuffleEnabled]);

  // Sleep timer handlers are handled by useGlobalAudioState

  const handleDelete = useCallback(
    async (articleId: number) => {
      if (!user?.id) return;
      try {
        selectionFeedback();
        await bookmarkService.removeFromReadingList(user.id, articleId as ArticleId);
        dispatch(removeFromCustomOrder(articleId));

        // Immediately update the specific article's reading list status
        queryClient.setQueryData(['readingList', user.id, articleId], false);

        // Then invalidate related queries to ensure consistency
        queryClient.invalidateQueries({
          queryKey: readingProgressQueries.keys.readingList(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: audioQueries.keys.tracks(user.id, audioPreference),
        });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [user?.id, dispatch, queryClient, audioPreference],
  );

  const handleArticlePlay = useCallback(
    async (articleId: number) => {
      if (isAudioBusy()) return;

      const currentArticleId = getCurrentArticleId();

      if (isCurrentlyPlaying && currentArticleId === articleId) {
        selectionFeedback();
        await simpleAudioService.stop();
        // STABILIZATION: Debounce playback mode change
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, TIMING_CONSTANTS.QUICK_DELAY);
        return;
      }

      // Play from tapped article (Spotify-style): start playlist from this position
      try {
        selectionFeedback();
        setPlaybackMode('all');

        // Find the index of the tapped article in the sorted tracks
        const startIndex = sortedEnhancedTracks.findIndex(t => t.articleId === articleId);

        if (startIndex === -1 || sortedEnhancedTracks.length === 0) {
          // Fallback: generate single track if not found in playlist
          const track = await enhancedAudioService.generateEnhancedAudioTrack(
            articleId as ArticleId,
            audioPreference,
          );
          if (track) {
            await simpleAudioService.play(track);
          }
          return;
        }

        // PREFETCH: warm article data and image so audio components show artwork instantly
        await prefetchArticleWithImage(articleId, queryClient, prefetchArticle);

        // Play playlist starting from tapped article
        const tracksFromHere = sortedEnhancedTracks.slice(startIndex);

        analytics.track(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED, {
          article_id: articleId,
          article_title: tracksFromHere[0]?.title || '',
          playlist_position: startIndex + 1,
          playlist_total: sortedEnhancedTracks.length,
        });

        const success = await simpleAudioService.playPlaylist(tracksFromHere, nextTrack => {
          if (nextTrack?.articleId) {
            prefetchArticleWithImage(nextTrack.articleId, queryClient, prefetchArticle);
          } else {
            // Playlist complete
            playbackModeTimeoutRef.current = setTimeout(() => {
              setPlaybackMode('none');
            }, TIMING_CONSTANTS.QUICK_DELAY);
          }
        });

        if (!success) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, TIMING_CONSTANTS.QUICK_DELAY);
        }
      } catch (error) {
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, TIMING_CONSTANTS.QUICK_DELAY);
        handleError(error as Error);
      }
    },
    [isCurrentlyPlaying, sortedEnhancedTracks, audioPreference, queryClient, prefetchArticle],
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (playbackModeTimeoutRef.current) {
        clearTimeout(playbackModeTimeoutRef.current);
      }
    };
  }, []);

  // Stop audio when screen loses focus
  useFocusEffect(
    useCallback(() => {
      // Cleanup function when screen loses focus
      return () => {
        // Stop any playing audio when navigating away from bookmarks screen
        stopAudioSafely();
      };
    }, []),
  );

  return {
    sortedReadingList,
    sortedEnhancedTracks,
    shouldShowInitialLoading,
    isReadingListLoading,
    playbackMode,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
