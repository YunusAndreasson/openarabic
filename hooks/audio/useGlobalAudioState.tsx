import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import type { SleepTimerHandle } from '@/components/playlist';
import { AUDIO_STATES } from '@/constants/audio';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlaylistScreen } from '@/hooks/playlist/usePlaylistScreen';
import { simpleAudioService } from '@/services/audioPlayer';
import type { Article } from '@/types/articles.types';
import type { BookmarkItem } from '@/types/bookmark.types';
import { successFeedback } from '@/utils/haptics';
import { useTimerCleanup } from '@/hooks/utils/useTimerCleanup';

// MiniPlayer-compatible article interface
interface MiniPlayerArticle {
  id: number;
  title: string;
  author: string;
  category: string;
  image_url: string;
}

export interface GlobalAudioState {
  // Audio state
  playing: boolean;
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
  isTimerActive: boolean;
  sleepTimerEndTime: number;
  /** Ref to the SleepTimer modal — AudioOverlays attaches it to the rendered sheet. */
  sleepTimerRef: RefObject<SleepTimerHandle | null>;

  // Actions
  onPlayPause: () => void;
  onTimerPress: () => void;
  onSleepTimerSet: (minutes: number) => void;
  onSleepTimerCancel: () => void;
  preconfigureAudioSession: () => Promise<void>;
}

/**
 * Internal hook — owns the actual audio/sleep-timer state. Must be invoked
 * exactly once per app via `GlobalAudioStateProvider`. Components consume
 * via `useGlobalAudioState`, which reads from context. This avoids the
 * duplicate-state bug where each call site had its own `showSleepTimerModal`
 * (and its own `useSleepTimer`) so taps on the MiniPlayer's timer button
 * never reached the SleepTimer modal renderer.
 */
function useGlobalAudioStateInternal(): GlobalAudioState {
  const { user } = useAuth();
  const audioPlayer = useSimpleAudioPlayer();
  const queryClient = useQueryClient();

  // Imperative handle to the SleepTimer modal. Avoids the state-based
  // useEffect → present() pattern which silently no-ops when the same
  // value is set twice (gesture-dismiss → tap → tap again).
  const sleepTimerRef = useRef<SleepTimerHandle | null>(null);

  // Get reading list for queue tracking
  const { sortedEnhancedTracks } = usePlaylistScreen();

  const { setTimer } = useTimerCleanup();

  // Sleep timer integration
  const sleepTimer = useSleepTimer(() => {
    successFeedback(); // Haptic feedback when timer completes
    sleepTimerRef.current?.dismiss();

    // CRITICAL FIX: Mark sleep timer as expired instead of stopping immediately
    // This allows the current track to finish naturally while preventing playlist progression
    simpleAudioService.markSleepTimerExpired();

    // Force stop after a reasonable delay (30 seconds)
    // This ensures we don't get stuck if audio never stops naturally
    setTimer(
      'forceStop',
      () => {
        // Only stop if we're still in playlist mode (track didn't finish yet)
        const playlistInfo = simpleAudioService.getPlaylistInfo();
        if (playlistInfo.isPlaylistMode) {
          audioPlayer.stop();
        }
      },
      30000,
    );
  });

  // Auto-cancel sleep timer when audio stops
  useEffect(() => {
    if (!audioPlayer.playing && !audioPlayer.isLoading && sleepTimer.state.isActive) {
      sleepTimer.actions.cancelTimer();
    }
  }, [audioPlayer.playing, audioPlayer.isLoading, sleepTimer.state.isActive, sleepTimer.actions]);

  // Get current article ID from audio player
  const currentArticleId = audioPlayer.currentTrack?.articleId ?? null;

  // Avoid refetching current article here; rely on cache and track metadata for mini-player

  // Calculate queue position
  const queuePosition = useMemo(() => {
    if (!currentArticleId || sortedEnhancedTracks.length <= 1) {
      return { current: 1, total: 1 };
    }

    const currentIndex = sortedEnhancedTracks.findIndex(
      track => track.articleId === currentArticleId,
    );

    if (currentIndex === -1) {
      return { current: 1, total: 1 }; // Single article not in playlist
    }

    return {
      current: currentIndex + 1,
      total: sortedEnhancedTracks.length,
    };
  }, [currentArticleId, sortedEnhancedTracks]);

  // PLAYLIST SUPPORT: Get playlist information from the audio service
  const playlistInfo = useMemo(() => {
    // Recompute when playback state or current track changes so indices stay accurate
    return simpleAudioService.getPlaylistInfo();
  }, [audioPlayer.currentTrack?.id, audioPlayer.playing, audioPlayer.isLoading]);

  // Enhanced queue position that considers actual playlist state
  const enhancedQueuePosition = useMemo(() => {
    if (playlistInfo.isPlaylistMode) {
      return {
        current: playlistInfo.currentIndex + 1,
        total: playlistInfo.totalTracks,
      };
    }
    return queuePosition;
  }, [playlistInfo, queuePosition]);

  // FLICKER FIX: Store last valid article to prevent null flashing during rapid state changes
  const lastValidArticleRef = useRef<MiniPlayerArticle | null>(null);

  // Format current article for mini-player with cache fallbacks (no waiting for fetch)
  const currentArticle = useMemo(() => {
    if (!currentArticleId) {
      // Only clear if we're truly stopping (not just transitioning states)
      if (!audioPlayer.playing && !audioPlayer.isLoading) {
        lastValidArticleRef.current = null;
      }
      return lastValidArticleRef.current;
    }

    const cachedArticle = queryClient.getQueryData<Article>(['article', currentArticleId]) ?? null;
    const readingList = user?.id
      ? (queryClient.getQueryData<BookmarkItem[]>(['readingList', user.id]) ?? null)
      : null;
    const readingListArticle =
      readingList?.find(i => i.article_id === currentArticleId)?.articles ?? null;

    const title = cachedArticle?.title || audioPlayer.currentTrack?.title || '';
    const author = cachedArticle?.author.name || readingListArticle?.author.name || '';
    const category = cachedArticle?.category.name || readingListArticle?.category.name || '';
    const imageUrl =
      cachedArticle?.image_url ||
      readingListArticle?.image_url ||
      audioPlayer.currentTrack?.imageUrl ||
      '';

    if (title || imageUrl) {
      const article = {
        id: currentArticleId,
        title,
        author,
        category,
        image_url: imageUrl,
      };
      lastValidArticleRef.current = article;
      return article;
    }

    // Last resort: metadata-only fallback while loading
    if (audioPlayer.currentTrack?.title && (audioPlayer.playing || audioPlayer.isLoading)) {
      const article = {
        id: currentArticleId,
        title: audioPlayer.currentTrack.title,
        author: 'Loading',
        category: '',
        image_url: '',
      };
      lastValidArticleRef.current = article;
      return article;
    }

    // FLICKER FIX: Return last valid article instead of null during transitions
    return lastValidArticleRef.current;
  }, [
    currentArticleId,
    queryClient,
    user?.id,
    audioPlayer.currentTrack?.title,
    audioPlayer.playing,
    audioPlayer.isLoading,
  ]);

  // Action handlers
  // MiniPlayer only shows when playing, so this only needs to handle stop
  const handlePlayPause = useCallback(async () => {
    // Stop behavior: stops playback and clears current track (hides MiniPlayer)
    // Note: Play is only initiated via PLAY ALL from Listen tab
    await audioPlayer.stop();
  }, [audioPlayer.stop]);

  const handleTimerPress = useCallback(() => {
    sleepTimerRef.current?.present();
  }, []);

  // Sleep timer handlers
  const handleSleepTimerSet = useCallback(
    (minutes: number) => {
      sleepTimer.actions.startTimer(minutes);
      // Don't close modal immediately - let it stay open to show countdown
    },
    [sleepTimer.actions],
  );

  const handleSleepTimerCancel = useCallback(() => {
    sleepTimer.actions.cancelTimer();
    sleepTimerRef.current?.dismiss();
  }, [sleepTimer.actions]);

  const handlePreconfigureAudioSession = useCallback(async () => {
    await audioPlayer.preconfigureAudioSession();
  }, [audioPlayer]);

  return {
    playing: audioPlayer.playing,
    audioState: audioPlayer.playing
      ? AUDIO_STATES.PLAYING
      : audioPlayer.isLoading
        ? AUDIO_STATES.LOADING
        : AUDIO_STATES.IDLE,
    isLoading: audioPlayer.isLoading,
    currentArticle,
    queuePosition: enhancedQueuePosition,
    position: audioPlayer.currentTime,
    duration: audioPlayer.duration,
    isTimerActive: sleepTimer.state.isActive,
    sleepTimerEndTime: sleepTimer.state.endTime,
    sleepTimerRef,
    onPlayPause: handlePlayPause,
    onTimerPress: handleTimerPress,
    onSleepTimerSet: handleSleepTimerSet,
    onSleepTimerCancel: handleSleepTimerCancel,
    preconfigureAudioSession: handlePreconfigureAudioSession,
  };
}

const GlobalAudioStateContext = createContext<GlobalAudioState | null>(null);

export function GlobalAudioStateProvider({ children }: { children: ReactNode }) {
  const value = useGlobalAudioStateInternal();
  return (
    <GlobalAudioStateContext.Provider value={value}>{children}</GlobalAudioStateContext.Provider>
  );
}

export function useGlobalAudioState(): GlobalAudioState {
  const ctx = useContext(GlobalAudioStateContext);
  if (!ctx) {
    throw new Error('useGlobalAudioState must be used within GlobalAudioStateProvider');
  }
  return ctx;
}
