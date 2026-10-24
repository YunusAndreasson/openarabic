import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';

import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import { useStartArticlePlayback } from '@/hooks/audio/useStartArticlePlayback';
// Use direct service access to avoid frequent parent re-renders from time updates
import { useAuth } from '@/hooks/auth/useAuth';
import { useSortedEnhancedTracks } from '@/hooks/playlist/useSortedEnhancedTracks';
import { enhancedAudioService } from '@/services/audioPlaylist';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/playlistSlice';
import { selectAudioLanguage } from '@/store/settingsSlice';
import type { ArticleId } from '@/types/branded.types';
import { isAudioBusy, stopNonPlaylistAudioSafely } from '@/utils/audioUtils';
import { selectionFeedback } from '@/utils/haptics';

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
  const dispatch = useAppDispatch();
  const audioPreference = useAppSelector(selectAudioLanguage);
  const startArticlePlayback = useStartArticlePlayback();

  const { readingListQuery, sortedReadingList, enhancedTracksQuery, sortedEnhancedTracks } =
    useSortedEnhancedTracks();
  // The query's `placeholderData: []` makes v5 report success before the first
  // fetch lands, so `isLoading` never turns true and an empty placeholder reads
  // as an empty playlist. While the placeholder is what's showing, the real list
  // is not known yet.
  const isReadingListLoading = readingListQuery.isPlaceholderData;
  const { error: enhancedTracksError } = enhancedTracksQuery;

  const shouldShowInitialLoading = useMemo(() => {
    return isReadingListLoading && sortedReadingList.length === 0;
  }, [isReadingListLoading, sortedReadingList.length]);

  // A failed first load has nothing to show. Without this it fell through to
  // the empty state and its "add beginner articles" seed.
  const readingListLoadFailed = readingListQuery.isError && sortedReadingList.length === 0;
  const retryReadingList = readingListQuery.refetch;

  // Refetch on screen focus using official React Query pattern
  // Automatically respects staleTime (5 minutes) - no manual throttling needed
  useRefreshOnFocus(readingListQuery.refetch);
  useRefreshOnFocus(enhancedTracksQuery.refetch);

  // The playlist's delete is the reader's bookmark removal — the same
  // mutation — so it gets the same analytics, the same refresh of everything
  // the list feeds (the tracks in every audio language included), and the same
  // offline queueing: a delete made offline lands when the connection returns.
  const { removeFromReadingListMutation } = useReadingListMutations();

  const handleDelete = async (articleId: ArticleId) => {
    if (!user?.id) return;
    try {
      selectionFeedback();
      await removeFromReadingListMutation.mutateAsync({ userId: user.id, articleId });
      dispatch(removeFromCustomOrder(articleId));
    } catch {
      // Already reported, once: the request's own failure by the mutation
      // cache, and the mutation's by its onError.
    }
  };

  const handleArticlePlay = useCallback(
    async (articleId: ArticleId) => {
      if (isAudioBusy()) return;

      const status = simpleAudioService.getStatus();
      if (status.playing && status.currentTrack?.articleId === articleId) {
        selectionFeedback();
        await simpleAudioService.stop();
        return;
      }

      // Play from tapped article (Spotify-style): start playlist from this position
      selectionFeedback();
      const startIndex = sortedEnhancedTracks.findIndex(t => t.articleId === articleId);
      if (startIndex !== -1) {
        await startArticlePlayback(sortedEnhancedTracks, { source: 'playlist_row', startIndex });
        return;
      }

      // The tracks have not caught up with the list yet (an article saved a
      // moment ago): build this one from the list's own copy of the article,
      // rather than downloading the whole article again to read five fields.
      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      const track = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId,
        audioPreference,
        article,
      );
      // On failure the service already showed an error toast
      if (!track) return;
      await startArticlePlayback([track], { source: 'playlist_row' });
    },
    [sortedEnhancedTracks, sortedReadingList, audioPreference, startArticlePlayback],
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
    shouldShowInitialLoading,
    isReadingListLoading,
    readingListLoadFailed,
    retryReadingList,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
