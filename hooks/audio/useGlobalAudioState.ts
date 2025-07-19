import { useCallback, useMemo, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useListenScreen } from '@/hooks/listen/useListenScreen';
import { openNowPlayingModal } from '@/utils/navigationHelpers';

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
 * Global audio state hook - provides unified audio state across the app
 * Integrates with mini-player, sleep timer, and navigation
 */
export function useGlobalAudioState(): GlobalAudioState {
  const { user } = useAuth();
  const audioPlayer = useSimpleAudioPlayer();

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

  // Format current article for mini-player
  const currentArticle = useMemo(() => {
    // Return immediately if no articleId
    if (!currentArticleId) return null;

    // If we have full article data, use it - images are guaranteed to be available
    if (articleData) {
      return {
        id: currentArticleId,
        title: articleData.title,
        author: articleData.author.name,
        image_url: String(articleData.image_url),
      };
    }

    // INSTANT MINI-PLAYER: Use fallback data from audio metadata while article loads
    // This eliminates the 500ms delay by showing mini-player immediately when audio starts
    if (audioPlayer.currentTrack?.title && (audioPlayer.isPlaying || audioPlayer.isLoading)) {
      return {
        id: currentArticleId,
        title: audioPlayer.currentTrack.title,
        author: 'Loading...',
        image_url: 'https://via.placeholder.com/400x300/5B7F68/FFFFFF?text=Audio',
      };
    }

    return null;
  }, [
    articleData,
    currentArticleId,
    audioPlayer.currentTrack?.title,
    audioPlayer.isPlaying,
    audioPlayer.isLoading,
  ]);

  // Action handlers
  const handlePlayPause = useCallback(async () => {
    if (audioPlayer.isPlaying) {
      await audioPlayer.stop(); // Use stop instead of pause since there's no resume
    } else {
      // For now, just stop - resume functionality would need to be implemented
      await audioPlayer.stop();
    }
  }, [audioPlayer.isPlaying, audioPlayer]);

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
    onPlayPause: handlePlayPause,
    onTimerPress: handleTimerPress,
    onExpandPress: handleExpandPress,
    onMiniPlayerPress: handleMiniPlayerPress,
    onSleepTimerSet: handleSleepTimerSet,
    onSleepTimerCancel: handleSleepTimerCancel,
    onSleepTimerClose: handleSleepTimerClose,
  };
}
