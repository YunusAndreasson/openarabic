import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useAudioProgressSubscription } from '@/hooks/audio/useAudioSubscription';
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

  // Queue information
  queuePosition: {
    current: number;
    total: number;
  };

  // Sleep timer state
  isTimerActive: boolean;
  sleepTimerEndTime: number;

  // Actions
  onPlayPause: () => void;
  onTimerPress: () => void;
  onSleepTimerSet: (minutes: number) => void;
  onSleepTimerCancel: () => void;
  preconfigureAudioSession: () => Promise<void>;
}

/**
 * Playback clock, kept in its own context: position ticks ~2x/sec while audio
 * plays, and only the MiniPlayer needs it. Everything else consumes
 * `GlobalAudioState`, whose identity is stable across position ticks.
 */
export interface AudioProgress {
  position: number;
  duration: number;
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

  // Get reading list for queue tracking
  const { sortedEnhancedTracks } = usePlaylistScreen();

  const { setTimer } = useTimerCleanup();

  // Sleep timer integration
  const sleepTimer = useSleepTimer(() => {
    successFeedback(); // Haptic feedback when timer completes

    // CRITICAL FIX: Mark sleep timer as expired instead of stopping immediately
    // This allows the current track to finish naturally while preventing playlist progression
    simpleAudioService.markSleepTimerExpired();

    // Force stop after a reasonable delay (30 seconds)
    // This ensures we don't get stuck if audio never stops naturally
    setTimer(
      'forceStop',
      () => {
        // Gating this on isPlaylistMode alone meant the sleep timer did
        // nothing for a single (non-"Play All") track: playCore's single-
        // track didJustFinish branch never checks sleepTimerExpired, so
        // nothing else was going to stop it either — the countdown would
        // reach zero and the article would just keep playing. Checking live
        // playing status instead covers both lanes; a track that already
        // finished naturally within the 30s grace window is a no-op here
        // either way.
        if (simpleAudioService.getStatus().playing) {
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

  // Format current article for mini-player with cache fallbacks (no waiting for fetch).
  // Anti-flicker design: ref is read AND latched during this memo so the MiniPlayer doesn't show
  // a blank state during transitions. Lifting to state would cause extra renders that defeat
  // the latch (we'd reset to null between renders before the next data arrived).
  // eslint-disable-next-line react-hooks/refs
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
    router.push('/sleep-timer');
  }, []);

  // Sleep timer handlers
  const handleSleepTimerSet = useCallback(
    (minutes: number) => {
      sleepTimer.actions.startTimer(minutes);
    },
    [sleepTimer.actions],
  );

  const handleSleepTimerCancel = useCallback(() => {
    sleepTimer.actions.cancelTimer();
  }, [sleepTimer.actions]);

  const handlePreconfigureAudioSession = useCallback(async () => {
    await audioPlayer.preconfigureAudioSession();
  }, [audioPlayer.preconfigureAudioSession]);

  // Explicit useMemo rather than relying on React Compiler: the ref latch in
  // the currentArticle memo makes this hook a compiler bail-out candidate, and
  // a context value must not change identity on every 500ms position tick.
  const state = useMemo<GlobalAudioState>(
    () => ({
      playing: audioPlayer.playing,
      audioState: audioPlayer.playing
        ? AUDIO_STATES.PLAYING
        : audioPlayer.isLoading
          ? AUDIO_STATES.LOADING
          : AUDIO_STATES.IDLE,
      isLoading: audioPlayer.isLoading,
      currentArticle,
      queuePosition: enhancedQueuePosition,
      isTimerActive: sleepTimer.state.isActive,
      sleepTimerEndTime: sleepTimer.state.endTime,
      onPlayPause: handlePlayPause,
      onTimerPress: handleTimerPress,
      onSleepTimerSet: handleSleepTimerSet,
      onSleepTimerCancel: handleSleepTimerCancel,
      preconfigureAudioSession: handlePreconfigureAudioSession,
    }),
    [
      audioPlayer.playing,
      audioPlayer.isLoading,
      currentArticle,
      enhancedQueuePosition,
      sleepTimer.state.isActive,
      sleepTimer.state.endTime,
      handlePlayPause,
      handleTimerPress,
      handleSleepTimerSet,
      handleSleepTimerCancel,
      handlePreconfigureAudioSession,
    ],
  );

  return state;
}

const GlobalAudioStateContext = createContext<GlobalAudioState | null>(null);
const AudioProgressContext = createContext<AudioProgress | null>(null);

/**
 * The playback clock, isolated in its own tiny component.
 *
 * This is the ONLY subscriber to the service's position channel, and it is
 * deliberately a leaf: position ticks re-render this component and nothing
 * else, because `children` arrives as a prop and React bails out of
 * re-rendering an unchanged element. Merging it back into
 * `GlobalAudioStateProvider` would put the whole app-root hook body — reading
 * list queries, queue position, article lookups — back on the tick, which
 * during a review prompt means ten times a second.
 */
function AudioProgressProvider({ children }: { children: ReactNode }) {
  const { status } = useAudioProgressSubscription();
  const position = status?.currentTime ?? 0;
  const duration = status?.duration ?? 0;
  const progress = useMemo<AudioProgress>(() => ({ position, duration }), [position, duration]);
  return <AudioProgressContext value={progress}>{children}</AudioProgressContext>;
}

export function GlobalAudioStateProvider({ children }: { children: ReactNode }) {
  const state = useGlobalAudioStateInternal();
  return (
    <GlobalAudioStateContext value={state}>
      <AudioProgressProvider>{children}</AudioProgressProvider>
    </GlobalAudioStateContext>
  );
}

export function useGlobalAudioState(): GlobalAudioState {
  const ctx = use(GlobalAudioStateContext);
  if (!ctx) {
    throw new Error('useGlobalAudioState must be used within GlobalAudioStateProvider');
  }
  return ctx;
}

export function useAudioProgress(): AudioProgress {
  const ctx = use(AudioProgressContext);
  if (!ctx) {
    throw new Error('useAudioProgress must be used within GlobalAudioStateProvider');
  }
  return ctx;
}
