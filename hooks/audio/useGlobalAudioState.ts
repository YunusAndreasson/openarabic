import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { ROUTE_PATHS } from '@/constants/routes';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useListenScreen } from '@/hooks/listen/useListenScreen';
import type { Article } from '@/types/articles.types';
import type { ReadingListItem } from '@/types/readingList.types';

export interface GlobalAudioState {
  // Audio state
  isPlaying: boolean;
  audioState: string;

  // Current article info
  currentArticle: {
    id: number;
    title: string;
    author: string;
    image_url: string;
  } | null;

  // Queue information
  queuePosition: {
    current: number;
    total: number;
  };

  // Audio progress
  position: number;
  duration: number;

  // Sleep timer state
  isTimerActive: boolean;
  showSleepTimerModal: boolean;
  sleepTimerRemainingTime: number;

  // Navigation state
  shouldHideMiniPlayer: boolean;

  // Action handlers
  onPlayPause: () => void;
  onTimerPress: () => void;
  onExpand: () => void;

  // Sleep timer handlers
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

  // STABILIZATION: Enhanced navigation state tracking
  const hasNavigatedToModalRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigationTimeRef = useRef(0);

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

  // Get current article data
  const { article: articleData } = useArticleData(currentArticleId || undefined, user?.id);

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

    const title =
      articleData?.title || cachedArticle?.title || audioPlayer.currentTrack?.title || '';
    const author =
      articleData?.author?.name ||
      cachedArticle?.author?.name ||
      readingListArticle?.author?.name ||
      '';
    const imageUrl = String(
      articleData?.image_url ||
        cachedArticle?.image_url ||
        readingListArticle?.image_url ||
        audioPlayer.currentTrack?.imageUrl ||
        ''
    );

    if (title || imageUrl) {
      return {
        id: currentArticleId,
        title: title || ' ',
        author,
        image_url: imageUrl || ' ',
      };
    }

    // Last resort: metadata-only fallback while loading
    if (audioPlayer.currentTrack?.title && (audioPlayer.isPlaying || audioPlayer.isLoading)) {
      return {
        id: currentArticleId,
        title: audioPlayer.currentTrack.title,
        author: 'Loading',
        image_url: ' ',
      };
    }

    return null;
  }, [
    articleData,
    currentArticleId,
    queryClient,
    user?.id,
    audioPlayer.currentTrack?.title,
    audioPlayer.isPlaying,
    audioPlayer.isLoading,
  ]);

  // STABILIZATION: Debounced navigation function to prevent rapid modal open/close
  const navigateToModal = useCallback(() => {
    const now = Date.now();
    const timeSinceLastNavigation = now - lastNavigationTimeRef.current;

    // Prevent navigation if it's been less than 1 second since last navigation
    if (timeSinceLastNavigation < 1000) {
      return;
    }

    // Clear existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Add small delay to prevent rapid navigation
    navigationTimeoutRef.current = setTimeout(() => {
      if (currentArticleId) {
        // Mark that we've navigated to modal
        hasNavigatedToModalRef.current = true;
        lastNavigationTimeRef.current = Date.now();

        // Navigate to modal directly
        router.push({
          pathname: ROUTE_PATHS.NOW_PLAYING,
          params: { articleId: currentArticleId.toString() },
        });
      }
    }, 100);
  }, [currentArticleId]);

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

  const handleExpand = useCallback(() => {
    navigateToModal();
  }, [navigateToModal]);

  // Single expand handler is sufficient for mini-player and expand button

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

  // STABILIZATION: Enhanced cleanup logic for navigation state
  useEffect(() => {
    // Reset navigation state when audio stops completely
    if (!audioPlayer.currentTrack && !audioPlayer.isLoading) {
      hasNavigatedToModalRef.current = false;
      lastNavigationTimeRef.current = 0;
    }
  }, [audioPlayer.currentTrack, audioPlayer.isLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // STABILIZATION: Simplified mini-player visibility logic
  const shouldHideMiniPlayer = useMemo(() => {
    // Hide mini-player if we've navigated to modal and audio is still playing/loading
    return hasNavigatedToModalRef.current && (audioPlayer.isPlaying || audioPlayer.isLoading);
  }, [audioPlayer.isPlaying, audioPlayer.isLoading]);

  return {
    isPlaying: audioPlayer.isPlaying,
    audioState: audioPlayer.isPlaying
      ? AUDIO_STATES.PLAYING
      : audioPlayer.isLoading
      ? AUDIO_STATES.LOADING
      : AUDIO_STATES.IDLE,
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
    onExpand: handleExpand,
    onSleepTimerSet: handleSleepTimerSet,
    onSleepTimerCancel: handleSleepTimerCancel,
    onSleepTimerClose: handleSleepTimerClose,
  };
}
