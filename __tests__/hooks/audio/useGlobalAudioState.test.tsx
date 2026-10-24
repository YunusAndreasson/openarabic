/**
 * useGlobalAudioState Hook Tests
 *
 * Tests the global audio state orchestration hook which manages:
 * - Audio playback state integration (play, pause, stop)
 * - Sleep timer lifecycle and auto-cancellation
 * - Queue position tracking (single article vs playlist mode)
 * - Current article resolution with cache fallbacks
 * - Flicker prevention during state transitions
 * - Memory cleanup (timeouts, listeners)
 *
 * The provider reads the service's status through useAudioSelector, so state
 * is driven by what the mocked service's getStatus() returns; a rerender reads
 * it again, as a notification would.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: No test.concurrent() - tests share mock state and need isolation
 */

// Mock dependencies BEFORE imports
jest.mock('@/hooks/auth/useAuth');
jest.mock('@/hooks/audio/useSleepTimer');
jest.mock('@/services/audioPlayer');
jest.mock('@/utils/haptics');
// The real module otherwise: the query factories the provider takes its cache
// keys from are built with it.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<object>('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';

import {
  GlobalAudioStateProvider,
  useAudioProgress,
  useGlobalAudioState,
} from '@/hooks/audio/useGlobalAudioState';
import { AUDIO_STATES } from '@/constants/audio';
import type { AudioStatus } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { articleId } from '@/__tests__/helpers/ids';
import { createAudioStatusMock } from '@/__tests__/helpers/serviceMocks';

const { useAuth } = require('@/hooks/auth/useAuth');
const { useSleepTimer } = require('@/hooks/audio/useSleepTimer');
const { simpleAudioService } = require('@/services/audioPlayer');
const { successFeedback } = require('@/utils/haptics');
const { useQueryClient } = require('@tanstack/react-query');

/** An article track, as the playlist and the reader build them. */
const ARTICLE_TRACK: EnhancedAudioTrack = {
  id: 'article-1',
  articleId: articleId(1),
  audioUrl: 'file:///a.mp3',
  title: 'Article',
};

/** An article track mid-play, as the service reports it. */
const PLAYING_ARTICLE_STATUS: Partial<AudioStatus> = {
  playing: true,
  isLoaded: true,
  isBuffering: false,
  playbackState: 'playing',
  currentTrack: ARTICLE_TRACK,
};

/** What the service reports from here on. */
function setStatus(overrides: Partial<AudioStatus> = {}): void {
  jest.mocked(simpleAudioService.getStatus).mockReturnValue(createAudioStatusMock(overrides));
}

describe('useGlobalAudioState Hook', () => {
  const mockStartTimer = jest.fn();
  const mockCancelTimer = jest.fn();
  // One object for every render, as the (compiled) hook returns.
  const mockSleepTimerActions = { startTimer: mockStartTimer, cancelTimer: mockCancelTimer };
  const mockGetQueryData = jest.fn((..._args: unknown[]) => null);
  let timerCallback: (() => void) | undefined;

  /** A running sleep timer whose completion the test fires itself. */
  const useActiveSleepTimer = (endTime = Date.now() + 60000): void => {
    jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
      timerCallback = onComplete;
      return { state: { isActive: true, endTime }, actions: mockSleepTimerActions } as any;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    timerCallback = undefined;

    setStatus();
    jest.mocked(simpleAudioService.subscribe).mockReturnValue(jest.fn());

    // Mock useAuth
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' },
    } as any);

    // Mock useSleepTimer
    jest.mocked(useSleepTimer).mockImplementation(
      () =>
        ({
          state: {
            isActive: false,
            endTime: 0,
          },
          actions: mockSleepTimerActions,
        }) as any,
    );

    // Mock QueryClient
    jest.mocked(useQueryClient).mockReturnValue({
      getQueryData: mockGetQueryData.mockReturnValue(null),
    } as unknown as QueryClient);

    // Mock haptics
    jest.mocked(successFeedback).mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization & Basic State', () => {
    test('initializes with idle state when not playing', () => {
      const { result } = renderHook(() => ({ ...useGlobalAudioState(), ...useAudioProgress() }), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.playing).toBeFalsy();
      expect(result.current.audioState).toBe(AUDIO_STATES.IDLE);
      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.currentArticle).toBeNull();
      expect(result.current.position).toBe(0);
      expect(result.current.duration).toBe(0);
    });

    test('reflects playing state from audio player', () => {
      setStatus({ ...PLAYING_ARTICLE_STATUS, currentTime: 30.6, duration: 120.2 });

      const { result } = renderHook(() => ({ ...useGlobalAudioState(), ...useAudioProgress() }), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.playing).toBeTruthy();
      expect(result.current.audioState).toBe(AUDIO_STATES.PLAYING);
      // The clock is in whole seconds, all the MiniPlayer shows.
      expect(result.current.position).toBe(30);
      expect(result.current.duration).toBe(120);
    });

    test('reflects loading state from audio player', () => {
      setStatus({ currentTrack: ARTICLE_TRACK, isLoaded: false, isBuffering: true });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.playing).toBeFalsy();
      expect(result.current.audioState).toBe(AUDIO_STATES.LOADING);
      expect(result.current.isLoading).toBeTruthy();
    });

    test('initializes sleep timer as inactive', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.isTimerActive).toBeFalsy();
      expect(result.current.sleepTimerEndTime).toBe(0);
    });

    test('keeps the same context value when nothing it carries changes', () => {
      setStatus(PLAYING_ARTICLE_STATUS);
      const { result, rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });
      const first = result.current;

      // A play-head tick: the transport readings are unchanged.
      setStatus({ ...PLAYING_ARTICLE_STATUS, currentTime: 12 });
      rerender(undefined);

      expect(result.current).toBe(first);
    });
  });

  describe('Play/Pause Actions', () => {
    test('onTogglePause hands the toggle to the service', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onTogglePause();
      });

      expect(simpleAudioService.togglePause).toHaveBeenCalledTimes(1);
    });

    test('onStop stops audio playback', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onStop();
      });

      expect(simpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    test('preconfigureAudioSession calls audio player method', async () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(simpleAudioService.preconfigureAudioSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sleep Timer route', () => {
    test('onTimerPress navigates to /sleep-timer', () => {
      const { router } = require('expo-router');
      const pushSpy = jest.spyOn(router, 'push');
      try {
        const { result } = renderHook(() => useGlobalAudioState(), {
          wrapper: GlobalAudioStateProvider,
        });

        act(() => {
          result.current.onTimerPress();
        });

        expect(pushSpy).toHaveBeenCalledWith('/sleep-timer');
      } finally {
        pushSpy.mockRestore();
      }
    });

    test('onSleepTimerSet starts timer', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onSleepTimerSet(30);
      });

      expect(mockStartTimer).toHaveBeenCalledWith(30);
    });

    test('onSleepTimerCancel cancels the timer', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onSleepTimerCancel();
      });

      expect(mockCancelTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sleep Timer Completion', () => {
    test('timer completion triggers haptic feedback', () => {
      useActiveSleepTimer();
      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      // Simulate timer completion
      act(() => {
        timerCallback?.();
      });

      expect(successFeedback).toHaveBeenCalledTimes(1);
    });

    test('timer completion marks sleep timer as expired', () => {
      useActiveSleepTimer();
      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });

      expect(simpleAudioService.markSleepTimerExpired).toHaveBeenCalledTimes(1);
    });

    test('timer completion sets force-stop timeout for 30 seconds (playlist mode)', () => {
      useActiveSleepTimer();
      setStatus({ ...PLAYING_ARTICLE_STATUS, queue: { index: 0, total: 5 } });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });

      // Should not stop immediately
      expect(simpleAudioService.stop).not.toHaveBeenCalled();

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should now force stop since the track is still playing
      expect(simpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    // Regression test: the force-stop used to gate on isPlaylistMode alone, so
    // a single (non-"Play All") track never got stopped by the sleep timer at
    // all — nothing else checks sleepTimerExpired for that lane. See
    // hooks/audio/useGlobalAudioState.tsx's forceStop comment.
    test('force-stop timeout also fires for a single track (not playlist mode) if still playing', () => {
      useActiveSleepTimer();
      setStatus(PLAYING_ARTICLE_STATUS);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
        jest.advanceTimersByTime(30000);
      });

      expect(simpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    // A paused track never reaches an end for the expired timer to act on, and
    // the 30-second check used to require `playing`, so a pause left the
    // session loaded past the timer for a later resume to carry on.
    test('a timer that runs out while paused stops at once', () => {
      useActiveSleepTimer();
      setStatus({ ...PLAYING_ARTICLE_STATUS, playing: false });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });

      expect(simpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    test('a pause inside the grace window still ends in a stop', () => {
      useActiveSleepTimer();
      setStatus(PLAYING_ARTICLE_STATUS);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });
      expect(simpleAudioService.stop).not.toHaveBeenCalled();

      setStatus({ ...PLAYING_ARTICLE_STATUS, playing: false });
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(simpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    test('force-stop timeout does not fire if playback already stopped naturally', () => {
      useActiveSleepTimer();

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
        jest.advanceTimersByTime(30000);
      });

      // Track already finished naturally within the grace window — no redundant stop.
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });

    test('clears previous force-stop timeout before setting new one', () => {
      useActiveSleepTimer();

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      // First completion
      act(() => {
        timerCallback?.();
      });

      // Fast-forward partway
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Second completion (should clear first timeout)
      act(() => {
        timerCallback?.();
      });

      // Fast-forward to where first timeout would have fired
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should not have called stop yet (first timeout was cleared)
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Cancel Sleep Timer', () => {
    test('auto-cancels timer when audio stops', async () => {
      useActiveSleepTimer(Date.now() + 120000);
      setStatus({ ...PLAYING_ARTICLE_STATUS, currentTime: 30, duration: 120 });

      const { rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      // Audio stops
      setStatus();
      rerender(undefined);

      await waitFor(() => {
        expect(mockCancelTimer).toHaveBeenCalled();
      });
    });

    test('does not auto-cancel when audio is loading', () => {
      useActiveSleepTimer(Date.now() + 120000);
      // Still loading — only ever true with a track loading
      setStatus({ currentTrack: ARTICLE_TRACK, isLoaded: false, isBuffering: true });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });

    test('does not auto-cancel when playback is merely paused', () => {
      // A lock-screen, headphone or phone-call pause: loaded, not playing.
      // Cancelling here lost the timer, and the playlist played on all night.
      useActiveSleepTimer(Date.now() + 120000);
      setStatus({ ...PLAYING_ARTICLE_STATUS, playing: false, playbackState: 'paused' });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });

    test('does not auto-cancel while a queue heals or skips a failed track', () => {
      // A failed track publishes "no current track" with the queue still on.
      useActiveSleepTimer(Date.now() + 120000);
      setStatus({ currentTrack: null, queue: { index: 1, total: 4 } });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });

    test('auto-cancels when a single article plays to its end', async () => {
      useActiveSleepTimer(Date.now() + 120000);
      setStatus({
        ...PLAYING_ARTICLE_STATUS,
        playing: false,
        currentTime: 120,
        duration: 120,
        playbackState: 'ended',
      });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      await waitFor(() => {
        expect(mockCancelTimer).toHaveBeenCalled();
      });
    });

    test('does not auto-cancel when timer is not active', () => {
      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });
  });

  describe('Queue Position Tracking', () => {
    test('returns default position when no article is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('a single article played outside a queue is 1 of 1, even when it is on the reading list', () => {
      // The position used to be found by matching the track against the
      // reading list, which put an article started from the reader at its
      // list position.
      setStatus(PLAYING_ARTICLE_STATUS);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('uses the queue position the service publishes', () => {
      setStatus({ ...PLAYING_ARTICLE_STATUS, queue: { index: 2, total: 10 } });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 3, // index + 1
        total: 10,
      });
    });

    test('follows the queue as it advances', () => {
      setStatus({ ...PLAYING_ARTICLE_STATUS, queue: { index: 0, total: 3 } });
      const { result, rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      setStatus({
        ...PLAYING_ARTICLE_STATUS,
        currentTrack: { ...ARTICLE_TRACK, id: 'article-2', articleId: articleId(2) },
        queue: { index: 1, total: 3 },
      });
      rerender(undefined);

      expect(result.current.queuePosition).toEqual({ current: 2, total: 3 });
    });
  });

  describe('Current Article Resolution', () => {
    test('returns null when no article is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toBeNull();
    });

    test('resolves article from cache', () => {
      setStatus(PLAYING_ARTICLE_STATUS);

      mockGetQueryData.mockImplementation((key: any) => {
        if (JSON.stringify(key) === JSON.stringify(['article', 1])) {
          return {
            id: 1,
            title: 'Cached Article',
            author: { name: 'Cached Author' },
            category: { name: 'Cached Category' },
            image_url: 'https://example.com/cached.jpg',
          };
        }
        return null;
      });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toEqual({
        id: 1,
        title: 'Cached Article',
        author: 'Cached Author',
        category: 'Cached Category',
        image_url: 'https://example.com/cached.jpg',
      });
    });

    test('falls back to reading list when cache is empty', () => {
      setStatus(PLAYING_ARTICLE_STATUS);

      mockGetQueryData.mockImplementation((key: any) => {
        if (JSON.stringify(key) === JSON.stringify(['readingList', 'test-user'])) {
          return [
            {
              article_id: 1,
              articles: {
                id: 1,
                title: 'Reading List Article',
                author: { name: 'RL Author' },
                category: { name: 'RL Category' },
                image_url: 'https://example.com/rl.jpg',
              },
            },
          ];
        }
        return null;
      });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toEqual({
        id: 1,
        title: 'Article',
        author: 'RL Author',
        category: 'RL Category',
        image_url: 'https://example.com/rl.jpg',
      });
    });

    test('falls back to track metadata when cache and reading list are empty', () => {
      setStatus({
        ...PLAYING_ARTICLE_STATUS,
        currentTrack: {
          ...ARTICLE_TRACK,
          title: 'Track Metadata Title',
          artist: 'Track Author',
          imageUrl: 'https://example.com/track.jpg',
        },
      });

      mockGetQueryData.mockReturnValue(null);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      // The track carries its author as `artist` (it is what the lock screen shows).
      expect(result.current.currentArticle).toEqual({
        id: 1,
        title: 'Track Metadata Title',
        author: 'Track Author',
        category: '',
        image_url: 'https://example.com/track.jpg',
      });
    });

    test('picks up an article that reaches the cache after playback started', () => {
      setStatus({ ...PLAYING_ARTICLE_STATUS, isLoaded: false, isBuffering: true });
      const { result, rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });
      expect(result.current.currentArticle?.category).toBe('');

      mockGetQueryData.mockImplementation((key: any) =>
        JSON.stringify(key) === JSON.stringify(['article', 1])
          ? {
              title: 'Article',
              author: { name: 'Author' },
              category: { name: 'Category' },
              image_url: 'https://example.com/image.jpg',
            }
          : null,
      );
      setStatus(PLAYING_ARTICLE_STATUS);
      rerender(undefined);

      expect(result.current.currentArticle?.category).toBe('Category');
    });

    test('holds the article while a clip that is not an article plays over it (flicker prevention)', () => {
      setStatus(PLAYING_ARTICLE_STATUS);

      mockGetQueryData.mockImplementation((key: any) => {
        if (JSON.stringify(key) === JSON.stringify(['article', 1])) {
          return {
            id: 1,
            title: 'Valid Article',
            author: { name: 'Author' },
            category: { name: 'Category' },
            image_url: 'https://example.com/image.jpg',
          };
        }
        return null;
      });

      const { result, rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      const validArticle = result.current.currentArticle;
      expect(validArticle).not.toBeNull();

      // A word preview starts loading in the article's place.
      setStatus({
        currentTrack: { id: 'word-1-ar', audioUrl: 'file:///word.mp3', title: 'كتب' },
        isLoaded: false,
        isBuffering: true,
      });
      rerender(undefined);

      // Should preserve last valid article (no flicker)
      expect(result.current.currentArticle).toEqual(validArticle);
    });

    test('clears last valid article when truly stopped', () => {
      setStatus(PLAYING_ARTICLE_STATUS);

      mockGetQueryData.mockImplementation((key: any) => {
        if (JSON.stringify(key) === JSON.stringify(['article', 1])) {
          return {
            id: 1,
            title: 'Valid Article',
            author: { name: 'Author' },
            category: { name: 'Category' },
            image_url: 'https://example.com/image.jpg',
          };
        }
        return null;
      });

      const { result, rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).not.toBeNull();

      // Fully stop (not playing, not loading, no track)
      setStatus();
      rerender(undefined);

      // Should clear article
      expect(result.current.currentArticle).toBeNull();
    });
  });

  describe('Memory Management', () => {
    test('cleans up force-stop timeout on unmount', () => {
      useActiveSleepTimer();
      setStatus(PLAYING_ARTICLE_STATUS);

      const { unmount } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      // Trigger timer completion to set timeout
      act(() => {
        timerCallback?.();
      });

      // Unmount before timeout fires
      unmount();

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not crash or call stop (timeout was cleaned up)
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });

    test('does not throw on unmount', () => {
      const { unmount } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined user gracefully', () => {
      jest.mocked(useAuth).mockReturnValue({
        user: undefined,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current).toBeDefined();
      expect(result.current.currentArticle).toBeNull();
    });

    test('a track that is not an article never becomes the current article', () => {
      setStatus({
        playing: true,
        isLoaded: true,
        currentTrack: { id: 'review-1', audioUrl: 'file:///review.mp3', title: 'Prompt' },
      });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toBeNull();
    });

    test('throws a clear error outside the provider', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => renderHook(() => useGlobalAudioState())).toThrow(
        'useGlobalAudioState must be used within GlobalAudioStateProvider',
      );
    });
  });
});
