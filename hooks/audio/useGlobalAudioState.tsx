import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import {
  audioQueuePosition,
  currentAudioTrack,
  isArticleAudioActive,
  isArticleAudioPaused,
  isAudioEnded,
  isAudioLoading,
  isAudioPlaying,
  wholeSecondsDuration,
  wholeSecondsPosition,
} from '@/hooks/audio/articleAudioStatus';
import { useAudioSelector } from '@/hooks/audio/useAudioSelector';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTimerCleanup } from '@/hooks/utils/useTimerCleanup';
import { simpleAudioService } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { createRequiredContext } from '@/utils/createRequiredContext';
import { successFeedback } from '@/utils/haptics';

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
  /** Pause the loaded article track, or resume it from where it stopped. */
  onTogglePause: () => void;
  /** Stop playback and clear the queue. */
  onStop: () => void;
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

/** A single article — or anything else played outside a queue — is 1 of 1. */
const SINGLE_TRACK_POSITION = { current: 1, total: 1 };

/**
 * The article track the MiniPlayer describes.
 *
 * FLICKER FIX: while a clip that is not an article (a word preview, a review
 * prompt) loads or plays over it, the last article track is held instead of
 * blanked, so the player does not flash empty on its way out. Only once nothing
 * is playing or loading — a real stop — is it let go.
 *
 * Held in state, not a ref, so it can be read during render: the update below
 * is the documented "store information from previous renders" pattern, and it
 * settles in one extra render because a held track is always one the service
 * itself published (a stable reference).
 */
function useHeldArticleTrack(
  track: EnhancedAudioTrack | null,
  busy: boolean,
): EnhancedAudioTrack | null {
  const [held, setHeld] = useState<EnhancedAudioTrack | null>(null);
  const articleTrack = track?.articleId !== undefined ? track : null;
  const shown = articleTrack ?? (busy ? held : null);
  if (shown !== held) setHeld(shown);
  return shown;
}

/**
 * The MiniPlayer's view of a track's article, from whatever is already cached
 * and the track's own metadata — never a fetch.
 */
function describeArticle(
  track: EnhancedAudioTrack,
  articleId: number,
  queryClient: QueryClient,
  userId: string | undefined,
): MiniPlayerArticle {
  const cachedArticle = queryClient.getQueryData(articleQueries.detail(track.articleId).queryKey);
  const readingList = userId
    ? queryClient.getQueryData(readingProgressQueries.readingList(userId).queryKey)
    : undefined;
  const readingListArticle = readingList?.find(i => i.article_id === articleId)?.articles;

  return {
    id: articleId,
    title: cachedArticle?.title || track.title,
    author: cachedArticle?.author.name || readingListArticle?.author.name || track.artist || '',
    category: cachedArticle?.category.name || readingListArticle?.category.name || '',
    image_url: cachedArticle?.image_url || readingListArticle?.image_url || track.imageUrl || '',
  };
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
  const queryClient = useQueryClient();

  // Each reading is a primitive or a reference the service published, so the
  // provider re-renders only when one of them actually changes.
  const playing = useAudioSelector(isAudioPlaying);
  const isLoading = useAudioSelector(isAudioLoading);
  const currentTrack = useAudioSelector(currentAudioTrack);
  const playbackEnded = useAudioSelector(isAudioEnded);
  const queue = useAudioSelector(audioQueuePosition);

  const { setTimer, clearTimer } = useTimerCleanup();

  // Sleep timer integration. The completion callback closes over nothing that
  // changes between renders, so it keeps its identity — and with it the
  // timer's own handlers and its AppState listener.
  const sleepTimer = useSleepTimer(() => {
    successFeedback(); // Haptic feedback when timer completes

    // CRITICAL FIX: Mark sleep timer as expired instead of stopping immediately
    // This allows the current track to finish naturally while preventing playlist progression
    simpleAudioService.markSleepTimerExpired();

    // A paused track has no end coming to wait for, and the 30-second check
    // below would find it not playing and leave it loaded, so a resume much
    // later would carry on past the timer. The timer ran out: end the session.
    if (isArticleAudioPaused(simpleAudioService.getStatus())) {
      void simpleAudioService.stop();
      return;
    }

    // Force stop after a reasonable delay (30 seconds)
    // This ensures we don't get stuck if audio never stops naturally
    //
    // Bound to the track that was playing when the timer ran out. Unbound, it
    // stopped whatever was playing 30 seconds later — including something the
    // listener had started on purpose after the timer had done its job.
    const trackAtExpiry = simpleAudioService.getStatus().currentTrack?.id;
    setTimer(
      'forceStop',
      () => {
        // Gating this on isPlaylistMode alone meant the sleep timer did
        // nothing for a single (non-"Play All") track: playCore's single-
        // track didJustFinish branch never checks sleepTimerExpired, so
        // nothing else was going to stop it either — the countdown would
        // reach zero and the article would just keep playing. Checking the
        // live track instead covers both lanes; a track that already finished
        // naturally within the 30s grace window is a no-op here either way.
        // Loaded, not just playing: a pause inside the grace window would
        // otherwise survive the timer and resume past it later.
        const status = simpleAudioService.getStatus();
        if (
          trackAtExpiry !== undefined &&
          status.currentTrack?.id === trackAtExpiry &&
          isArticleAudioActive(status)
        ) {
          void simpleAudioService.stop();
        }
      },
      30000,
    );
  });

  // Auto-cancel the sleep timer when the listening session ends: playback was
  // stopped or the queue ran out (no current track), or a single article
  // played to its end. NOT on a pause — a lock-screen, headphone, Siri or
  // phone-call pause reports `playing: false` on a still-loaded player, and
  // cancelling there meant the timer was silently gone when playback resumed,
  // so a "15 minutes" playlist played on all night. Playlist mode never
  // publishes 'ended' between tracks; the guard keeps it that way.
  useEffect(() => {
    if (!sleepTimer.state.isActive) return;
    // The queue guards BOTH arms. A track that fails to load publishes "no
    // current track" while the queue heals or skips it, and reading that as
    // the end of the session cancelled the timer on a playlist that then
    // carried on. A stop or a finished queue leaves the queue first.
    const sessionOver = queue === null && (!currentTrack || playbackEnded);
    if (sessionOver) {
      sleepTimer.actions.cancelTimer();
    }
  }, [queue, currentTrack, playbackEnded, sleepTimer.state.isActive, sleepTimer.actions]);

  // A new timer supersedes the previous one's pending force-stop.
  const sleepEndTime = sleepTimer.state.endTime;
  useEffect(() => {
    if (sleepEndTime > 0) clearTimer('forceStop');
  }, [sleepEndTime, clearTimer]);

  const articleTrack = useHeldArticleTrack(currentTrack, playing || isLoading);
  const userId = user?.id;

  // Action handlers. Each keeps its identity for the life of the provider, so
  // the context value below changes only with the state it carries.

  // Pause or resume the loaded article track in place. The service handles
  // and reports its own failures.
  const handleTogglePause = useCallback(() => {
    void simpleAudioService.togglePause();
  }, []);

  // Stops playback and clears the queue, which hides the MiniPlayer.
  const handleStop = useCallback(() => {
    void simpleAudioService.stop();
  }, []);

  const handleTimerPress = useCallback(() => {
    router.push(ROUTE_PATHS.SLEEP_TIMER);
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
    await simpleAudioService.preconfigureAudioSession();
  }, []);

  // A context value must not change identity on every 500ms position tick.
  const state = useMemo<GlobalAudioState>(
    () => ({
      playing,
      audioState: playing
        ? AUDIO_STATES.PLAYING
        : isLoading
          ? AUDIO_STATES.LOADING
          : AUDIO_STATES.IDLE,
      isLoading,
      // Format current article for mini-player with cache fallbacks (no
      // waiting for fetch). Re-read on every transport change, so an article
      // or reading list that reached the cache after playback started is
      // picked up.
      currentArticle:
        articleTrack?.articleId !== undefined
          ? describeArticle(articleTrack, articleTrack.articleId, queryClient, userId)
          : null,
      // The queue position comes from the service, which knows whether this is
      // a queue at all. Matching the track against the reading list instead
      // put a single article played from the reader at its list position.
      queuePosition: queue
        ? { current: queue.index + 1, total: queue.total }
        : SINGLE_TRACK_POSITION,
      isTimerActive: sleepTimer.state.isActive,
      sleepTimerEndTime: sleepTimer.state.endTime,
      onTogglePause: handleTogglePause,
      onStop: handleStop,
      onTimerPress: handleTimerPress,
      onSleepTimerSet: handleSleepTimerSet,
      onSleepTimerCancel: handleSleepTimerCancel,
      preconfigureAudioSession: handlePreconfigureAudioSession,
    }),
    [
      playing,
      isLoading,
      articleTrack,
      queryClient,
      userId,
      queue,
      sleepTimer.state.isActive,
      sleepTimer.state.endTime,
      handleTogglePause,
      handleStop,
      handleTimerPress,
      handleSleepTimerSet,
      handleSleepTimerCancel,
      handlePreconfigureAudioSession,
    ],
  );

  return state;
}

const [GlobalAudioStateContext, useGlobalAudioState] = createRequiredContext<GlobalAudioState>(
  'GlobalAudioStateContext',
  'useGlobalAudioState must be used within GlobalAudioStateProvider',
);
const [AudioProgressContext, useAudioProgress] = createRequiredContext<AudioProgress>(
  'AudioProgressContext',
  'useAudioProgress must be used within GlobalAudioStateProvider',
);

export { useAudioProgress, useGlobalAudioState };

/**
 * The playback clock, isolated in its own tiny component.
 *
 * This is the ONLY subscriber to the service's position channel, and it is
 * deliberately a leaf: position ticks re-render this component and nothing
 * else, because `children` arrives as a prop and React bails out of
 * re-rendering an unchanged element. Merging it back into
 * `GlobalAudioStateProvider` would put the whole app-root hook body — article
 * lookups, sleep timer, queue position — back on the tick, which during a
 * review prompt means ten times a second.
 *
 * Whole seconds: the MiniPlayer clock renders whole seconds, so a sub-second
 * change is filtered here and never becomes a React commit — not for every
 * native 500 ms status event, nor every 100 ms review event.
 */
function AudioProgressProvider({ children }: { children: ReactNode }) {
  const position = useAudioSelector(wholeSecondsPosition, { position: true });
  const duration = useAudioSelector(wholeSecondsDuration, { position: true });
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
