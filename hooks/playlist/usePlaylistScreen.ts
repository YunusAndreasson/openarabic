import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_TOAST_DURATION, TIMING_CONSTANTS } from '@/constants/animation';
import { audioQueries, readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useToast } from '@/components/providers';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
// Use direct service access to avoid frequent parent re-renders from time updates
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { enhancedAudioService, warmTrackCache } from '@/services/audioPlaylist';
import { simpleAudioService } from '@/services/audioPlayer';
import { bookmarkService } from '@/services/bookmark';
import { useAppDispatch, useAppSelector, useAppSelectorShallow } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/playlistSlice';
import type { ArticleId } from '@/types/branded.types';
import { AudioLanguage, ToastType } from '@/types/enums';
import { OnboardingStep } from '@/constants/onboarding';
import {
  getCurrentArticleId,
  isAudioBusy,
  prefetchArticleWithImage,
  stopNonPlaylistAudioSafely,
} from '@/utils/audioUtils';
import { markOnboardingStep } from '@/utils/onboardingStorage';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback, selectionFeedback } from '@/utils/haptics';
import { useTimerCleanup } from '@/hooks/utils/useTimerCleanup';
import { shuffleArray } from '@/utils/list';
import { sortByCustomOrder, sortByDateDesc } from '@/utils/sortingUtils';

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
      void refetch();
    }, [refetch]),
  );
}

export const usePlaylistScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { prefetchArticle } = useAppPreloader();
  const { showToast } = useToast();

  const customOrder = useAppSelector(state => state.playlist.customOrder);
  const { audioPreference, audioShuffleEnabled } = useAppSelectorShallow(state => ({
    audioPreference: state.settings.audioLanguagePreference,
    audioShuffleEnabled: state.settings.audioShuffleEnabled,
  }));

  // STABILIZATION: Add debouncing for playback mode changes
  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');
  const { setTimer, clearTimer } = useTimerCleanup();

  // Sleep timer functionality is handled by useGlobalAudioState

  const readingListQuery = useQuery(
    user?.id
      ? readingProgressQueries.readingList(user.id)
      : {
          queryKey: ['readingList', 'none'] as const,
          queryFn: () => Promise.resolve([]),
          enabled: false,
        },
  );
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

    // Sort by custom order with date fallback
    return sortByCustomOrder(
      deduped,
      customOrder,
      item => item.article_id,
      (a, b) => sortByDateDesc(a.added_at, b.added_at),
    );
  }, [readingList, customOrder]);

  const isDataCached = Boolean(
    user?.id && queryClient.getQueryData(readingProgressQueries.readingList(user.id).queryKey),
  );

  const enhancedTracksQuery = useQuery(
    user?.id
      ? audioQueries.tracks(user.id, audioPreference)
      : {
          queryKey: ['enhancedAudioTracks', 'none', 'arabic'] as const,
          queryFn: () => Promise.resolve([]),
          enabled: false,
        },
  );
  const { data: enhancedTracks = [], error: enhancedTracksError } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    // Create position map from sorted reading list order
    const readingListOrder = sortedReadingList.map(item => item.article_id);

    return sortByCustomOrder(enhancedTracks, readingListOrder, track => track.articleId || 0);
  }, [enhancedTracks, sortedReadingList]);

  const shouldShowInitialLoading = useMemo(() => {
    return !isDataCached && isReadingListLoading && sortedReadingList.length === 0;
  }, [isDataCached, isReadingListLoading, sortedReadingList.length]);

  // Refetch on screen focus using official React Query pattern
  // Automatically respects staleTime (5 minutes) - no manual throttling needed
  useRefreshOnFocus(readingListQuery.refetch);
  useRefreshOnFocus(enhancedTracksQuery.refetch);

  // STABILIZATION: Enhanced handlePlayAll with better state management
  const handlePlayAll = useCallback(
    async (forceArabicOnly = false) => {
      // Clear playback mode timeout
      clearTimer('playbackMode');

      // Get current values directly from audio service instead of relying on local state
      const currentStatus = simpleAudioService.getStatus();
      const currentPlaybackMode = playbackMode;
      const currentTracks = sortedEnhancedTracks;

      const isCurrentlyPlayingNow = currentStatus.playing;

      if (isAudioBusy()) {
        return;
      }

      if (isCurrentlyPlayingNow && currentPlaybackMode === 'all') {
        try {
          selectionFeedback();
          await simpleAudioService.stop();
          // STABILIZATION: Debounce playback mode change
          setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
        } catch {
          setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
        }
      } else if (currentTracks.length) {
        try {
          selectionFeedback();
          // STABILIZATION: Set playback mode immediately for UI feedback
          setPlaybackMode('all');

          // Use override preference if set (passed as parameter), otherwise use user's setting
          const effectivePreference = forceArabicOnly ? AudioLanguage.ARABIC_ONLY : audioPreference;

          // Fetch tracks with effective preference if override is active
          const effectiveTracks =
            forceArabicOnly && user?.id
              ? await enhancedAudioService.getReadingListEnhancedTracks(
                  user.id,
                  effectivePreference,
                )
              : currentTracks;

          // The override can legitimately have no playable tracks even when
          // the user's normal-language playlist is populated.
          if (!effectiveTracks.length) {
            setPlaybackMode('none');
            return;
          }

          // Only report playback after resolving a non-empty effective list.
          void analytics.track(ANALYTICS_EVENTS.AUDIO_PLAY_ALL_STARTED, {
            article_count: effectiveTracks.length,
            source: 'listen_tab',
            shuffle_enabled: audioShuffleEnabled,
          });

          // PLAYLIST SUPPORT: Use the new playlist functionality instead of just playing the first track
          const tracksToPlay = audioShuffleEnabled
            ? shuffleArray(effectiveTracks)
            : effectiveTracks;

          const success = await simpleAudioService.playPlaylist(tracksToPlay, nextTrack => {
            // Callback when a track completes and the next one starts
            if (nextTrack?.articleId) {
              // Prefetch the next article's data and image for smooth transitions
              void prefetchArticleWithImage(nextTrack.articleId, queryClient, prefetchArticle);
              // Cache the now-playing track for offline replay (no-op if it was
              // already local). Only ever the current track — warming the whole
              // playlist is what used to saturate the connection.
              warmTrackCache(nextTrack);
            } else {
              // Playlist is complete, reset playback mode
              setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
            }
          });

          if (success) {
            // Playback is live — warm only the track that's actually playing.
            const firstTrack = tracksToPlay[0];
            if (firstTrack) warmTrackCache(firstTrack);
            void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
          } else {
            setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
          }
        } catch (error) {
          setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
          void handleError(error);
        }
      }
    },
    [
      playbackMode,
      sortedEnhancedTracks,
      audioPreference,
      audioShuffleEnabled,
      user,
      queryClient,
      prefetchArticle,
      clearTimer,
      setTimer,
    ],
  );

  // Long-press handler for temporary Arabic-only playback
  const handlePlayAllArabicOnly = useCallback(async () => {
    // Trigger haptic feedback
    mediumFeedback();

    // Show toast notification at bottom (near Play All button)
    showToast(
      STRINGS.PLAYING_ARABIC_ONLY_THIS_SESSION,
      DEFAULT_TOAST_DURATION,
      ToastType.INFO,
      'bottom',
    );

    // Start playback with Arabic-only override
    await handlePlayAll(true);
  }, [handlePlayAll, showToast]);

  // Sleep timer handlers are handled by useGlobalAudioState

  const handleDelete = async (articleId: ArticleId) => {
    if (!user?.id) return;
    try {
      selectionFeedback();
      await bookmarkService.removeFromReadingList(user.id, articleId);
      dispatch(removeFromCustomOrder(articleId));

      // Immediately update the specific article's reading list status
      queryClient.setQueryData(['readingList', user.id, articleId], false);

      // Then invalidate related queries to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: readingProgressQueries.readingList(user.id).queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: audioQueries.tracks(user.id, audioPreference).queryKey,
      });
    } catch (error) {
      void handleError(error);
    }
  };

  const handleArticlePlay = useCallback(
    async (articleId: ArticleId) => {
      if (isAudioBusy()) return;

      const currentArticleId = getCurrentArticleId();
      const isCurrentlyPlaying = simpleAudioService.getStatus().playing;

      if (isCurrentlyPlaying && currentArticleId === articleId) {
        selectionFeedback();
        await simpleAudioService.stop();
        // STABILIZATION: Debounce playback mode change
        setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
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
            articleId,
            audioPreference,
          );
          if (!track) {
            setPlaybackMode('none');
            return;
          }

          const played = await simpleAudioService.play(track);
          if (played) {
            warmTrackCache(track);
            void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
          } else {
            setPlaybackMode('none');
          }
          return;
        }

        // PREFETCH: warm article data and image so audio components show artwork instantly
        await prefetchArticleWithImage(articleId, queryClient, prefetchArticle);

        // Play playlist starting from tapped article
        const tracksFromHere = sortedEnhancedTracks.slice(startIndex);

        void analytics.track(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED, {
          article_id: articleId,
          article_title: tracksFromHere[0]?.title || '',
          playlist_position: startIndex + 1,
          playlist_total: sortedEnhancedTracks.length,
        });

        const success = await simpleAudioService.playPlaylist(tracksFromHere, nextTrack => {
          if (nextTrack?.articleId) {
            void prefetchArticleWithImage(nextTrack.articleId, queryClient, prefetchArticle);
            warmTrackCache(nextTrack);
          } else {
            // Playlist complete
            setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
          }
        });

        if (success) {
          const firstTrack = tracksFromHere[0];
          if (firstTrack) warmTrackCache(firstTrack);
          void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
        } else {
          setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
        }
      } catch (error) {
        setTimer('playbackMode', () => setPlaybackMode('none'), TIMING_CONSTANTS.QUICK_DELAY);
        void handleError(error);
      }
    },
    [sortedEnhancedTracks, audioPreference, queryClient, prefetchArticle, setTimer],
  );

  // Clean up leaked non-playlist audio when the screen loses focus.
  // Playlist playback deliberately survives tab switches (podcast-style) —
  // the global MiniPlayer is its control surface.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopNonPlaylistAudioSafely();
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
    handlePlayAllArabicOnly,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
