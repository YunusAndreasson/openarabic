import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { STRINGS } from '@/constants/strings';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
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

  const customOrder = useAppSelector(state => state.listen.customOrder);

  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');

  const enhancedAudioPlayer = useAudioPlayer();
  const { duration, position, metadata, audioState, actions } = enhancedAudioPlayer;

  const isStartingPlayback = audioState === AUDIO_STATES.LOADING;

  const loadingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearLoadingTimeouts = useCallback(() => {
    loadingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    loadingTimeoutsRef.current = [];
  }, []);

  const sleepTimer = useSleepTimer(() => {
    actions.stopPlayback();
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
  const {
    data: readingList = [],
    isLoading: isReadingListLoading,
    isFetching: isReadingListFetching,
  } = readingListQuery;

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
    return (
      !isDataCached &&
      isReadingListLoading &&
      !isReadingListFetching &&
      sortedReadingList.length === 0
    );
  }, [isDataCached, isReadingListLoading, isReadingListFetching, sortedReadingList.length]);

  useScreenFocusRefresh(queryClient, 'readingList', user?.id, 1000 * 60 * 5, true, true);
  useScreenFocusRefresh(queryClient, 'enhancedAudioTracks', user?.id, 1000 * 60 * 5, true, true);

  const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;

  const handlePlayAll = useCallback(
    async (setLoading?: (loading: boolean) => void) => {
      clearLoadingTimeouts();
      if (isStartingPlayback) return;

      if (isCurrentlyPlaying && playbackMode === 'all') {
        try {
          selectionFeedback();
          await actions.stopPlayback();
          setPlaybackMode('none');
        } catch {
          setPlaybackMode('none');
        }
      } else if (sortedEnhancedTracks.length) {
        try {
          selectionFeedback();

          // Set loading state with minimum duration
          if (setLoading) {
            setLoading(true);
            const loadingStartTime = Date.now();
            const MIN_LOADING_DURATION = 300; // 300ms minimum

            setPlaybackMode('all');
            actions
              .startEnhancedPlayback(sortedEnhancedTracks, 0)
              .then(success => {
                if (!success) {
                  setPlaybackMode('none');
                }
                // Ensure minimum loading duration
                const elapsed = Date.now() - loadingStartTime;
                const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
                const timeout = setTimeout(() => setLoading(false), remainingTime);
                loadingTimeoutsRef.current.push(timeout);
              })
              .catch(err => {
                setPlaybackMode('none');
                handleError(err as Error);
                // Ensure minimum loading duration even for errors
                const elapsed = Date.now() - loadingStartTime;
                const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
                const timeout = setTimeout(() => setLoading(false), remainingTime);
                loadingTimeoutsRef.current.push(timeout);
              });
          } else {
            // Fallback for when no loading setter is provided
            setPlaybackMode('all');
            actions
              .startEnhancedPlayback(sortedEnhancedTracks, 0)
              .then(success => {
                if (!success) {
                  setPlaybackMode('none');
                }
              })
              .catch(err => {
                setPlaybackMode('none');
                handleError(err as Error);
              });
          }
        } catch (error) {
          setPlaybackMode('none');
          handleError(error as Error);
          if (setLoading) {
            const timeout = setTimeout(() => setLoading(false), 300);
            loadingTimeoutsRef.current.push(timeout);
          }
        }
      }
    },
    [
      isStartingPlayback,
      isCurrentlyPlaying,
      playbackMode,
      sortedEnhancedTracks,
      actions.startEnhancedPlayback,
      actions.stopPlayback,
    ]
  );

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
      if (isStartingPlayback) {
        return;
      }

      if (isCurrentlyPlaying && parseInt(metadata.articleId ?? '', 10) === articleId) {
        selectionFeedback();
        await actions.stopPlayback();
        setPlaybackMode('none');
        return;
      }

      const articleIndex = sortedEnhancedTracks.findIndex(track => track.articleId === articleId);

      if (articleIndex !== -1 && sortedEnhancedTracks.length) {
        // Normal case: play from existing enhanced tracks
        try {
          selectionFeedback();
          setPlaybackMode('all');
          const success = await actions.startEnhancedPlayback(sortedEnhancedTracks, articleIndex);
          if (!success) {
            setPlaybackMode('none');
          }
        } catch (error) {
          setPlaybackMode('none');
          handleError(error as Error);
        }
      } else {
        // Fallback: generate single track for this article
        try {
          selectionFeedback();
          setPlaybackMode('all');

          const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);
          if (track) {
            const success = await actions.startEnhancedPlayback([track], 0);
            if (!success) {
              setPlaybackMode('none');
            }
          } else {
            setPlaybackMode('none');
            handleError(new Error('Audio not available for this article'), {
              toastMessage: STRINGS.AUDIO_NOT_AVAILABLE_FOR_ARTICLE,
              showToast: true,
            });
          }
        } catch (error) {
          setPlaybackMode('none');
          handleError(error as Error);
        }
      }
    },
    [
      isStartingPlayback,
      isCurrentlyPlaying,
      metadata.articleId,
      sortedEnhancedTracks,
      actions.startEnhancedPlayback,
      actions.stopPlayback,
    ]
  );

  useEffect(() => {
    return clearLoadingTimeouts;
  }, [clearLoadingTimeouts]);

  return {
    sortedReadingList,
    sortedEnhancedTracks,
    shouldShowInitialLoading,
    isReadingListLoading,
    isReadingListFetching,
    isStartingPlayback,
    setPlaybackMode,
    playbackMode,
    duration,
    position,
    metadata,
    audioState,
    actions,
    sleepTimer,
    handleSleepTimerSet,
    handleSleepTimerCancel,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  };
};
