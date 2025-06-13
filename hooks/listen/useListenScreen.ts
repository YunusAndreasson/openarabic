import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useScreenFocusRefresh } from '@/hooks/utils/useScreenFocusRefresh';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCustomOrder } from '@/store/listenSlice';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

export type ReadingListItem = Tables<'reading_list'> & {
  articles: Article & {
    author: {
      id: number;
      name: string;
    };
  };
};

export const useListenScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const customOrder = useAppSelector(state => state.listen.customOrder);

  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');

  const enhancedAudioPlayer = useAudioPlayer();
  const { duration, position, metadata, audioState, actions } = enhancedAudioPlayer;

  const isStartingPlayback = audioState === AUDIO_STATES.LOADING;

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
  const { data: enhancedTracks = [] } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    const articlePositionMap = new Map(
      sortedReadingList.map((item, index) => [item.article_id, index])
    );

    return [...enhancedTracks].sort((a, b) => {
      const posA = a.articleId ? (articlePositionMap.get(a.articleId) ?? 999) : 999;
      const posB = b.articleId ? (articlePositionMap.get(b.articleId) ?? 999) : 999;
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

  useScreenFocusRefresh(queryClient, 'listen', user?.id, 1000 * 60 * 5, true, true);

  const focusEffectCallback = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({
      queryKey: ['readingList', user.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['enhancedAudioTracks', user.id],
    });
    return () => {};
  }, [user?.id, queryClient]);
  useFocusEffect(focusEffectCallback);

  const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;

  const handlePlayAll = useCallback(async () => {
    if (isStartingPlayback) return;

    if (isCurrentlyPlaying && playbackMode === 'all') {
      selectionFeedback();
      await actions.stopPlayback();
      setPlaybackMode('none');
    } else if (sortedEnhancedTracks.length) {
      try {
        selectionFeedback();
        setPlaybackMode('all');
        await actions.startEnhancedPlayback(sortedEnhancedTracks, 0);
      } catch (error) {
        setPlaybackMode('none');
        handleError(error as Error);
      }
    }
  }, [
    isStartingPlayback,
    isCurrentlyPlaying,
    playbackMode,
    sortedEnhancedTracks,
    actions.startEnhancedPlayback,
    actions.stopPlayback,
  ]);

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
      if (isStartingPlayback) return;

      if (isCurrentlyPlaying && parseInt(metadata.articleId ?? '', 10) === articleId) {
        selectionFeedback();
        await actions.stopPlayback();
        setPlaybackMode('none');
        return;
      }

      const articleIndex = sortedEnhancedTracks.findIndex(track => track.articleId === articleId);

      if (articleIndex !== -1 && sortedEnhancedTracks.length) {
        try {
          selectionFeedback();
          setPlaybackMode('all');
          await actions.startEnhancedPlayback(sortedEnhancedTracks, articleIndex);
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
  };
};
