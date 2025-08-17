import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useListenScreen } from '@/hooks/listen/useListenScreen';
import type { Article } from '@/types/articles.types';
import type { ReadingListItem } from '@/types/readingList.types';

// MiniPlayer-compatible article interface
interface MiniPlayerArticle {
  id: number;
  title: string;
  author: string;
  image_url: string;
}

export interface GlobalAudioState {
  // Audio state
  isPlaying: boolean;
  audioState: string;
  isLoading: boolean;
  currentArticle: MiniPlayerArticle | null;
  position: number;
  duration: number;

  // Queue information
  queuePosition: {
    current: number;
    total: number;
  };

  // Sleep timer state
  showSleepTimerModal: boolean;
  isTimerActive: boolean;
  sleepTimerRemainingTime: number;

  // Mini-player visibility
  shouldHideMiniPlayer: boolean;

  // Actions
  onPlayPause: () => void;
  onTimerPress: () => void;
  onSleepTimerSet: (minutes: number) => void;
  onSleepTimerCancel: () => void;
  onSleepTimerClose: () => void;
}

/**
 * Global audio state hook - provides unified audio state across the app
 * Integrates with mini-player, sleep timer, and navigation
 */
export function useGlobalAudioState(): GlobalAudioState {
  const { user } = useAuth();
  const audioPlayer = useSimpleAudioPlayer();
  const queryClient = useQueryClient();

  // Sleep timer modal state
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  // Get reading list for queue tracking
  const { sortedEnhancedTracks } = useListenScreen();

  // Sleep timer integration
  const sleepTimer = useSleepTimer(() => {
    audioPlayer.stop();
  });

  // Get current article ID from audio player
  const currentArticleId = useMemo(() => {
    const articleIdString = audioPlayer.currentTrack?.articleId?.toString();
    return articleIdString ? parseInt(articleIdString, 10) : null;
  }, [audioPlayer.currentTrack?.articleId]);

  // Avoid refetching current article here; rely on cache and track metadata for mini-player

  // Calculate queue position
  const queuePosition = useMemo(() => {
    if (!currentArticleId || sortedEnhancedTracks.length <= 1) {
      return { current: 1, total: 1 };
    }

    const currentIndex = sortedEnhancedTracks.findIndex(
      track => track.articleId === currentArticleId
    );

    if (currentIndex === -1) {
      return { current: 1, total: 1 }; // Single article not in playlist
    }

    return {
      current: currentIndex + 1,
      total: sortedEnhancedTracks.length,
    };
  }, [currentArticleId, sortedEnhancedTracks]);

  // Format current article for mini-player with cache fallbacks (no waiting for fetch)
  const currentArticle = useMemo(() => {
    if (!currentArticleId) return null;

    const cachedArticle = queryClient.getQueryData<Article>(['article', currentArticleId]) ?? null;
    const readingList = user?.id
      ? queryClient.getQueryData<ReadingListItem[]>(['readingList', user.id]) ?? null
      : null;
    const readingListArticle =
      readingList?.find(i => i.article_id === currentArticleId)?.articles ?? null;

    const title = cachedArticle?.title || audioPlayer.currentTrack?.title || '';
    const author = cachedArticle?.author?.name || readingListArticle?.author?.name || '';
    const imageUrl = String(
      cachedArticle?.image_url ||
        readingListArticle?.image_url ||
        audioPlayer.currentTrack?.imageUrl
    );

    if (title || imageUrl) {
      return {
        id: currentArticleId,
        title,
        author,
        image_url: imageUrl,
      };
    }

    // Last resort: metadata-only fallback while loading
    if (audioPlayer.currentTrack?.title && (audioPlayer.isPlaying || audioPlayer.isLoading)) {
      return {
        id: currentArticleId,
        title: audioPlayer.currentTrack.title,
        author: 'Loading',
        image_url: '',
      };
    }

    return null;
  }, [
    currentArticleId,
    queryClient,
    user?.id,
    audioPlayer.currentTrack?.title,
    audioPlayer.isPlaying,
    audioPlayer.isLoading,
  ]);

  // Action handlers
  const handlePlayPause = useCallback(async () => {
    if (audioPlayer.isPlaying) {
      await audioPlayer.pause();
      return;
    }

    // If not playing and we have a current track, resume; otherwise do nothing here.
    // Play for a new track is handled by screen-level actions (e.g., handleArticlePlay).
    await audioPlayer.resume();
  }, [audioPlayer.isPlaying, audioPlayer.pause, audioPlayer.resume]);

  const handleTimerPress = useCallback(() => {
    setShowSleepTimerModal(true);
  }, []);

  // Sleep timer handlers
  const handleSleepTimerSet = useCallback(
    (minutes: number) => {
      sleepTimer.actions.startTimer(minutes);
      setShowSleepTimerModal(false);
    },
    [sleepTimer.actions]
  );

  const handleSleepTimerCancel = useCallback(() => {
    sleepTimer.actions.cancelTimer();
    setShowSleepTimerModal(false);
  }, [sleepTimer.actions]);

  const handleSleepTimerClose = useCallback(() => {
    setShowSleepTimerModal(false);
  }, []);

  // STABILIZATION: Simplified mini-player visibility logic
  const shouldHideMiniPlayer = useMemo(() => {
    // Hide mini-player if we've navigated to modal and audio is still playing/loading
    return false; // No longer navigated to modal, so always show
  }, [audioPlayer.isPlaying, audioPlayer.isLoading]);

  return {
    isPlaying: audioPlayer.isPlaying,
    audioState: audioPlayer.isPlaying
      ? AUDIO_STATES.PLAYING
      : audioPlayer.isLoading
      ? AUDIO_STATES.LOADING
      : AUDIO_STATES.IDLE,
    isLoading: audioPlayer.isLoading,
    currentArticle,
    queuePosition,
    position: audioPlayer.currentTime,
    duration: audioPlayer.duration,
    isTimerActive: sleepTimer.state.isActive,
    showSleepTimerModal,
    sleepTimerRemainingTime: sleepTimer.state.remainingTime,
    shouldHideMiniPlayer,
    onPlayPause: handlePlayPause,
    onTimerPress: handleTimerPress,
    onSleepTimerSet: handleSleepTimerSet,
    onSleepTimerCancel: handleSleepTimerCancel,
    onSleepTimerClose: handleSleepTimerClose,
  };
}
