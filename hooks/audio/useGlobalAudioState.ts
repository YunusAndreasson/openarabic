import { useCallback, useMemo, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useAuth } from '@/hooks/auth/useAuth';
import { useListenScreen } from '@/hooks/listen/useListenScreen';
import { openNowPlayingModal } from '@/utils/navigationHelpers';

import { useSimpleAudioPlayer } from './useSimpleAudioPlayer';
import { useSleepTimer } from './useSleepTimer';

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

  // Sleep timer state
  isTimerActive: boolean;
  showSleepTimerModal: boolean;
  sleepTimerRemainingTime: number;

  // Action handlers
  onPlayPause: () => void;
  onTimerPress: () => void;
  onExpandPress: () => void;
  onMiniPlayerPress: () => void;

  // Sleep timer handlers
  onSleepTimerSet: (minutes: number) => void;
  onSleepTimerCancel: () => void;
  onSleepTimerClose: () => void;
}

/**
 * Global hook for managing audio state across the entire app
 * Provides mini-player with all necessary data and controls
 */
export function useGlobalAudioState(): GlobalAudioState {
  const { user } = useAuth();
  const audioPlayer = useSimpleAudioPlayer();
  const { audioState } = audioPlayer;

  // Sleep timer modal state
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  // Get reading list for queue tracking
  const { sortedEnhancedTracks } = useListenScreen();

  // Sleep timer integration
  const sleepTimer = useSleepTimer(() => {
    audioPlayer.stop();
  });

  // Extract current article ID and get article data
  const currentArticleId = useMemo(() => {
    const articleIdString = audioPlayer.metadata.articleId;
    return articleIdString ? parseInt(articleIdString, 10) : null;
  }, [audioPlayer.metadata.articleId]);

  const { article } = useArticleData(currentArticleId || undefined, user?.id);

  // Determine if audio is currently playing
  const isPlaying = useMemo(() => {
    return audioState === AUDIO_STATES.PLAYING;
  }, [audioState]);

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

  // Format current article for mini-player
  const currentArticle = useMemo(() => {
    if (!article || !currentArticleId || !article.image_url) return null;

    return {
      id: currentArticleId,
      title: article.title,
      author: article.author.name,
      image_url: article.image_url,
    };
  }, [article, currentArticleId]);

  // Action handlers
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await audioPlayer.stop(); // Use stop instead of pause since there's no resume
    } else {
      // For now, just stop - resume functionality would need to be implemented
      await audioPlayer.stop();
    }
  }, [isPlaying, audioPlayer]);

  const handleTimerPress = useCallback(() => {
    setShowSleepTimerModal(true);
  }, []);

  const handleExpandPress = useCallback(() => {
    if (currentArticleId) {
      openNowPlayingModal({ articleId: currentArticleId.toString() });
    }
  }, [currentArticleId]);

  const handleMiniPlayerPress = useCallback(() => {
    // Tap entire mini-player to expand - same as expand button
    handleExpandPress();
  }, [handleExpandPress]);

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

  return {
    isPlaying,
    audioState,
    currentArticle,
    queuePosition,
    isTimerActive: sleepTimer.state.isActive,
    showSleepTimerModal,
    sleepTimerRemainingTime: sleepTimer.state.remainingTime,
    onPlayPause: handlePlayPause,
    onTimerPress: handleTimerPress,
    onExpandPress: handleExpandPress,
    onMiniPlayerPress: handleMiniPlayerPress,
    onSleepTimerSet: handleSleepTimerSet,
    onSleepTimerCancel: handleSleepTimerCancel,
    onSleepTimerClose: handleSleepTimerClose,
  };
}
