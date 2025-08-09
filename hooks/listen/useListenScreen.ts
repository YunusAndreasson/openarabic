import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useScreenFocusRefresh } from '@/hooks/utils/useScreenFocusRefresh';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/listenSlice';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

export const useListenScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { prefetchArticle } = useAppPreloader();

  const customOrder = useAppSelector(state => state.listen.customOrder);

  // STABILIZATION: Add debouncing for playback mode changes
  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');
  const playbackModeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioPlayer = useSimpleAudioPlayer();
  const { duration, currentTime, currentTrack, isPlaying, isLoading } = audioPlayer;

  const position = currentTime;
  const metadata = {
    articleId: currentTrack?.articleId?.toString() || null,
    articleTitle: currentTrack?.title || null,
  };
  const audioState = isPlaying
    ? AUDIO_STATES.PLAYING
    : isLoading
    ? AUDIO_STATES.LOADING
    : AUDIO_STATES.IDLE;

  const sleepTimer = useSleepTimer(() => {
    audioPlayer.stop();
    setPlaybackMode('none');
  });

  const readingListQuery = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return readingListService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    placeholderData: [],
  });
  const { data: readingList = [], isLoading: isReadingListLoading } = readingListQuery;

  const dedupedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    const seen = new Set<number>();
    return readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });
  }, [readingList]);

  const sortedReadingList = useMemo(() => {
    if (!dedupedReadingList.length) return [];

    if (customOrder.length > 0) {
      const customOrderMap = new Map(customOrder.map((id, index) => [id, index]));
      return [...dedupedReadingList].sort((a, b) => {
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

    return [...dedupedReadingList].sort((a, b) => {
      const dateA = new Date(a.added_at).getTime();
      const dateB = new Date(b.added_at).getTime();
      return dateB - dateA;
    });
  }, [dedupedReadingList, customOrder]);

  const isDataCached = useMemo(() => {
    return !!(user?.id && queryClient.getQueryData(['readingList', user.id]));
  }, [user?.id, queryClient]);

  const enhancedTracksQuery = useQuery({
    queryKey: ['enhancedAudioTracks', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
  const { data: enhancedTracks = [], error: enhancedTracksError } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    const articlePositionMap = new Map(
      sortedReadingList.map((item, index) => [item.article_id, index])
    );

    return [...enhancedTracks].sort((a, b) => {
      const posA = a.articleId ? articlePositionMap.get(a.articleId) ?? 999 : 999;
      const posB = b.articleId ? articlePositionMap.get(b.articleId) ?? 999 : 999;
      return posA - posB;
    });
  }, [enhancedTracks, sortedReadingList]);

  const shouldShowInitialLoading = useMemo(() => {
    return !isDataCached && isReadingListLoading && sortedReadingList.length === 0;
  }, [isDataCached, isReadingListLoading, sortedReadingList.length]);

  useScreenFocusRefresh(queryClient, 'readingList', user?.id, 1000 * 60 * 5, true, true);
  useScreenFocusRefresh(queryClient, 'enhancedAudioTracks', user?.id, 1000 * 60 * 5, true, true);

  const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;

  // STABILIZATION: Enhanced handlePlayAll with better state management
  const handlePlayAll = useCallback(async () => {
    // Clear playback mode timeout
    if (playbackModeTimeoutRef.current) {
      clearTimeout(playbackModeTimeoutRef.current);
    }

    // Get current values directly instead of relying on captured values
    const currentAudioState = audioState;
    const currentPlaybackMode = playbackMode;
    const currentTracks = sortedEnhancedTracks;

    const isCurrentlyStarting = currentAudioState === AUDIO_STATES.LOADING;
    const isCurrentlyPlayingNow = currentAudioState === AUDIO_STATES.PLAYING;

    if (isCurrentlyStarting) return;

    if (isCurrentlyPlayingNow && currentPlaybackMode === 'all') {
      try {
        selectionFeedback();
        await audioPlayer.stop();
        // STABILIZATION: Debounce playback mode change
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, 100);
      } catch {
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, 100);
      }
    } else if (currentTracks.length) {
      try {
        selectionFeedback();
        // STABILIZATION: Set playback mode immediately for UI feedback
        setPlaybackMode('all');

        // SIMPLIFIED: Just play the first track (service handles one track at a time)
        const firstTrack = currentTracks[0];
        if (!firstTrack) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, 100);
          return;
        }

        // PREFETCH: warm article data and image so NowPlaying shows artwork instantly
        const articleIdToPrefetch = firstTrack.articleId;
        if (articleIdToPrefetch) {
          // Fire-and-forget
          queryClient
            .prefetchQuery({
              queryKey: ['article', articleIdToPrefetch],
              queryFn: () => articlesService.getArticleById(articleIdToPrefetch),
            })
            .catch(() => {});

          // Try to fetch image URL from cache immediately if present
          const articleInCache = queryClient.getQueryData<any>(['article', articleIdToPrefetch]);
          const imageUrl = String(firstTrack.imageUrl || articleInCache?.image_url || '');
          if (imageUrl) {
            Image.prefetch(imageUrl).catch(() => {});
          } else {
            // As a fallback, use preloader helper which will also prefetch details
            prefetchArticle(articleIdToPrefetch).catch(() => {});
          }
        }

        // Start playing immediately without loading states
        const success = await audioPlayer.play(firstTrack);
        if (!success) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, 100);
        }
      } catch (error) {
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, 100);
        handleError(error as Error);
      }
    }
  }, [playbackMode, sortedEnhancedTracks, audioPlayer.play, audioPlayer.stop, audioState]);

  const handleSleepTimerSet = useCallback(
    (minutes: number) => {
      sleepTimer.actions.startTimer(minutes);
    },
    [sleepTimer.actions]
  );

  const handleSleepTimerCancel = useCallback(() => {
    sleepTimer.actions.cancelTimer();
  }, [sleepTimer.actions]);

  const handleDelete = useCallback(
    async (articleId: number) => {
      if (!user?.id) return;
      try {
        selectionFeedback();
        await readingListService.removeFromReadingList(user.id, articleId);
        dispatch(removeFromCustomOrder(articleId));

        // Immediately update the specific article's reading list status
        queryClient.setQueryData(['readingList', user.id, articleId], false);

        // Then invalidate related queries to ensure consistency
        queryClient.invalidateQueries({
          queryKey: ['readingList', user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['enhancedAudioTracks', user.id],
        });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [user?.id, dispatch, queryClient]
  );

  const handleArticlePlay = useCallback(
    async (articleId: number) => {
      if (isLoading) {
        return;
      }

      if (isCurrentlyPlaying && parseInt(metadata.articleId ?? '', 10) === articleId) {
        selectionFeedback();
        await audioPlayer.stop();
        // STABILIZATION: Debounce playback mode change
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, 100);
        return;
      }

      const articleIndex = sortedEnhancedTracks.findIndex(track => track.articleId === articleId);

      if (articleIndex !== -1 && sortedEnhancedTracks.length) {
        // Play the specific track from enhanced tracks
        const trackToPlay = sortedEnhancedTracks[articleIndex];
        if (!trackToPlay) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, 100);
          return;
        }

        try {
          selectionFeedback();
          setPlaybackMode('all');

          // PREFETCH: warm article data and image for this specific article
          queryClient
            .prefetchQuery({
              queryKey: ['article', articleId],
              queryFn: () => articlesService.getArticleById(articleId),
            })
            .catch(() => {});
          const cached = queryClient.getQueryData<any>(['article', articleId]);
          const img = String(trackToPlay.imageUrl || cached?.image_url || '');
          if (img) {
            Image.prefetch(img).catch(() => {});
          } else {
            prefetchArticle(articleId).catch(() => {});
          }

          const success = await audioPlayer.play(trackToPlay);
          if (!success) {
            playbackModeTimeoutRef.current = setTimeout(() => {
              setPlaybackMode('none');
            }, 100);
          }
        } catch (error) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, 100);
          handleError(error as Error);
        }
      } else {
        // Generate single track for this article on-demand
        try {
          selectionFeedback();
          setPlaybackMode('all');

          // PREFETCH: ensure article details and artwork are warmed
          queryClient
            .prefetchQuery({
              queryKey: ['article', articleId],
              queryFn: () => articlesService.getArticleById(articleId),
            })
            .catch(() => {});
          const cachedArticle = queryClient.getQueryData<any>(['article', articleId]);
          const cachedImg = String(cachedArticle?.image_url || '');
          if (cachedImg) {
            Image.prefetch(cachedImg).catch(() => {});
          } else {
            prefetchArticle(articleId).catch(() => {});
          }

          const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);
          if (track) {
            const success = await audioPlayer.play(track);
            if (!success) {
              playbackModeTimeoutRef.current = setTimeout(() => {
                setPlaybackMode('none');
              }, 100);
            }
          } else {
            playbackModeTimeoutRef.current = setTimeout(() => {
              setPlaybackMode('none');
            }, 100);
          }
        } catch (error) {
          playbackModeTimeoutRef.current = setTimeout(() => {
            setPlaybackMode('none');
          }, 100);
          handleError(error as Error);
        }
      }
    },
    [
      isLoading,
      isCurrentlyPlaying,
      metadata.articleId,
      sortedEnhancedTracks,
      audioPlayer.play,
      audioPlayer.stop,
    ]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (playbackModeTimeoutRef.current) {
        clearTimeout(playbackModeTimeoutRef.current);
      }
    };
  }, []);

  return {
    sortedReadingList,
    sortedEnhancedTracks,
    shouldShowInitialLoading,
    isReadingListLoading,
    playbackMode,
    duration,
    position,
    metadata,
    audioState,
    isLoading,
    sleepTimer,
    handleSleepTimerSet,
    handleSleepTimerCancel,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
