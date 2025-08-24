import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
// Use direct service access to avoid frequent parent re-renders from time updates
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useScreenFocusRefresh } from '@/hooks/utils/useScreenFocusRefresh';
import { articlesService } from '@/services/articles';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { simpleAudioService } from '@/services/simpleAudioService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/listenSlice';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { generateImageUrl } from '@/utils/imageUtils';

export const useListenScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { prefetchArticle } = useAppPreloader();

  const customOrder = useAppSelector(state => state.listen.customOrder);
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);

  // STABILIZATION: Add debouncing for playback mode changes
  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');
  const playbackModeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Minimal audio state subscription: only update when state transitions, ignore time ticks
  const [audioState, setAudioState] = useState(() => {
    const status = simpleAudioService.getStatus();
    return status.isPlaying
      ? AUDIO_STATES.PLAYING
      : status.isLoading
      ? AUDIO_STATES.LOADING
      : AUDIO_STATES.IDLE;
  });

  const sleepTimer = useSleepTimer(() => {
    simpleAudioService.stop().catch(() => {});
    setPlaybackMode('none');
  });

  // Monitor audio state and auto-cancel sleep timer when audio stops
  useEffect(() => {
    const unsubscribe = simpleAudioService.subscribe(status => {
      const nextState = status.isPlaying
        ? AUDIO_STATES.PLAYING
        : status.isLoading
        ? AUDIO_STATES.LOADING
        : AUDIO_STATES.IDLE;

      // Auto-cancel sleep timer when audio stops
      if (nextState === AUDIO_STATES.IDLE && audioState !== AUDIO_STATES.IDLE) {
        sleepTimer.actions.autoCancel();
      }

      setAudioState(prev => (prev !== nextState ? nextState : prev));
    });
    return unsubscribe;
  }, [audioState, sleepTimer.actions]);

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
    queryKey: ['enhancedAudioTracks', user?.id, audioPreference],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id, audioPreference);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Standard stale time is fine now
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
        await simpleAudioService.stop();
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

        // PLAYLIST SUPPORT: Use the new playlist functionality instead of just playing the first track
        const success = await simpleAudioService.playPlaylist(currentTracks, nextTrack => {
          // Callback when a track completes and the next one starts
          if (nextTrack) {
            // Prefetch the next article's data and image for smooth transitions
            const articleIdToPrefetch = nextTrack.articleId;
            if (articleIdToPrefetch) {
              queryClient
                .prefetchQuery({
                  queryKey: ['article', articleIdToPrefetch],
                  queryFn: () => articlesService.getArticleById(articleIdToPrefetch),
                })
                .catch(() => {});

              const articleInCache = queryClient.getQueryData<any>([
                'article',
                articleIdToPrefetch,
              ]);
              const imageUrl = String(nextTrack.imageUrl || articleInCache?.image_url);
              if (imageUrl) {
                Image.prefetch(imageUrl).catch(() => {});
              } else {
                prefetchArticle(articleIdToPrefetch).catch(() => {});
              }
            }
          } else {
            // Playlist is complete, reset playback mode
            playbackModeTimeoutRef.current = setTimeout(() => {
              setPlaybackMode('none');
            }, 100);
          }
        });

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
  }, [playbackMode, sortedEnhancedTracks, audioState, audioPreference]);

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
          queryKey: ['enhancedAudioTracks', user.id, audioPreference],
        });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [user?.id, dispatch, queryClient, audioPreference]
  );

  const handleArticlePlay = useCallback(
    async (articleId: number) => {
      const status = simpleAudioService.getStatus();
      if (status.isLoading) return;

      const currentArticleId = status.currentTrack?.articleId
        ? parseInt(status.currentTrack.articleId.toString(), 10)
        : undefined;

      if (isCurrentlyPlaying && currentArticleId === articleId) {
        selectionFeedback();
        await simpleAudioService.stop();
        // STABILIZATION: Debounce playback mode change
        playbackModeTimeoutRef.current = setTimeout(() => {
          setPlaybackMode('none');
        }, 100);
        return;
      }

      // Always generate fresh track to ensure correct audio preference
      // Don't use pre-generated tracks as they might have stale preferences
      try {
        selectionFeedback();
        setPlaybackMode('all');

        // PREFETCH: warm article data and image so audio components show artwork instantly
        queryClient
          .prefetchQuery({
            queryKey: ['article', articleId],
            queryFn: () => articlesService.getArticleById(articleId),
          })
          .catch(() => {});
        const cachedArticle = queryClient.getQueryData<any>(['article', articleId]);
        const cachedImg = generateImageUrl(cachedArticle?.image_url);
        if (cachedImg) {
          Image.prefetch(cachedImg).catch(() => {});
        } else {
          prefetchArticle(articleId).catch(() => {});
        }

        const track = await enhancedAudioService.generateEnhancedAudioTrack(
          articleId,
          audioPreference
        );
        if (track) {
          const success = await simpleAudioService.play(track);
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
    },
    [isCurrentlyPlaying, sortedEnhancedTracks, audioPreference]
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
    audioState,
    sleepTimer,
    handleSleepTimerSet,
    handleSleepTimerCancel,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
