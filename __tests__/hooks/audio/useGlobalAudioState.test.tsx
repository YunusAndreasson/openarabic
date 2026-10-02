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
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: No test.concurrent() - tests share mock state and need isolation
 */

// Mock dependencies BEFORE imports
jest.mock('@/hooks/auth/useAuth');
jest.mock('@/hooks/audio/useSimpleAudioPlayer');
jest.mock('@/hooks/audio/useSleepTimer');
jest.mock('@/hooks/playlist/usePlaylistScreen');
jest.mock('@/services/audioPlayer');
jest.mock('@/utils/haptics');
jest.mock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';

import {
  GlobalAudioStateProvider,
  useAudioProgress,
  useGlobalAudioState,
} from '@/hooks/audio/useGlobalAudioState';
import { AUDIO_STATES } from '@/constants/audio';

const { useAuth } = require('@/hooks/auth/useAuth');
const { useSimpleAudioPlayer } = require('@/hooks/audio/useSimpleAudioPlayer');
const { useSleepTimer } = require('@/hooks/audio/useSleepTimer');
const { usePlaylistScreen } = require('@/hooks/playlist/usePlaylistScreen');
const { simpleAudioService } = require('@/services/audioPlayer');
const { successFeedback } = require('@/utils/haptics');
const { useQueryClient } = require('@tanstack/react-query');

describe('useGlobalAudioState Hook', () => {
  const mockStop = jest.fn();
  const mockPreconfigureAudioSession = jest.fn();
  const mockStartTimer = jest.fn();
  const mockCancelTimer = jest.fn();
  const mockGetQueryData = jest.fn((..._args: unknown[]) => null);
  const mockMarkSleepTimerExpired = jest.fn();
  const mockGetPlaylistInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // The playback clock reads the service's position channel directly, not the
    // transport status the rest of the provider uses — the whole point of the
    // split is that play-head ticks never reach those consumers.
    jest
      .mocked(simpleAudioService.getStatus)
      .mockReturnValue({ currentTime: 0, duration: 0 } as any);
    jest.mocked(simpleAudioService.subscribe).mockReturnValue(jest.fn());

    // Mock useAuth
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' },
    } as any);

    // Mock useSimpleAudioPlayer
    jest.mocked(useSimpleAudioPlayer).mockReturnValue({
      playing: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      currentTrack: null,
      stop: mockStop,
      preconfigureAudioSession: mockPreconfigureAudioSession,
    } as any);

    // Mock useSleepTimer
    jest.mocked(useSleepTimer).mockImplementation(
      (onComplete: () => void) =>
        ({
          state: {
            isActive: false,
            endTime: 0,
          },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
          onComplete, // Store for testing
        }) as any,
    );

    // Mock usePlaylistScreen
    jest.mocked(usePlaylistScreen).mockReturnValue({
      sortedEnhancedTracks: [],
    } as any);

    // Mock simpleAudioService
    simpleAudioService.markSleepTimerExpired = mockMarkSleepTimerExpired;
    simpleAudioService.getPlaylistInfo = mockGetPlaylistInfo.mockReturnValue({
      isPlaylistMode: false,
      currentIndex: 0,
      totalTracks: 0,
    });

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
      jest
        .mocked(simpleAudioService.getStatus)
        .mockReturnValue({ currentTime: 30, duration: 120 } as any);
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTrack: {
          id: 'track-1',
          articleId: 1,
          title: 'Test Article',
        },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => ({ ...useGlobalAudioState(), ...useAudioProgress() }), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.playing).toBeTruthy();
      expect(result.current.audioState).toBe(AUDIO_STATES.PLAYING);
      expect(result.current.position).toBe(30);
      expect(result.current.duration).toBe(120);
    });

    test('reflects loading state from audio player', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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

    test('initializes with default queue position', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });
  });

  describe('Play/Pause Actions', () => {
    test('onPlayPause stops audio playback', async () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      await act(async () => {
        await result.current.onPlayPause();
      });

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('preconfigureAudioSession calls audio player method', async () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(mockPreconfigureAudioSession).toHaveBeenCalledTimes(1);
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
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      // Simulate timer completion
      act(() => {
        timerCallback?.();
      });

      expect(successFeedback).toHaveBeenCalledTimes(1);
    });

    test('timer completion marks sleep timer as expired', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });

      expect(mockMarkSleepTimerExpired).toHaveBeenCalledTimes(1);
    });

    test('timer completion sets force-stop timeout for 30 seconds (playlist mode)', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

      mockGetPlaylistInfo.mockReturnValue({
        isPlaylistMode: true,
        currentIndex: 0,
        totalTracks: 5,
      });
      jest
        .mocked(simpleAudioService.getStatus)
        .mockReturnValue({ currentTime: 0, duration: 0, playing: true } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
      });

      // Should not stop immediately
      expect(mockStop).not.toHaveBeenCalled();

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should now force stop since the track is still playing
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    // Regression test: the force-stop used to gate on isPlaylistMode alone, so
    // a single (non-"Play All") track never got stopped by the sleep timer at
    // all — nothing else checks sleepTimerExpired for that lane. See
    // hooks/audio/useGlobalAudioState.tsx's forceStop comment.
    test('force-stop timeout also fires for a single track (not playlist mode) if still playing', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

      mockGetPlaylistInfo.mockReturnValue({
        isPlaylistMode: false,
        currentIndex: 0,
        totalTracks: 0,
      });
      jest
        .mocked(simpleAudioService.getStatus)
        .mockReturnValue({ currentTime: 0, duration: 0, playing: true } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
        jest.advanceTimersByTime(30000);
      });

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('force-stop timeout does not fire if playback already stopped naturally', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

      jest
        .mocked(simpleAudioService.getStatus)
        .mockReturnValue({ currentTime: 0, duration: 0, playing: false } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      act(() => {
        timerCallback?.();
        jest.advanceTimersByTime(30000);
      });

      // Track already finished naturally within the grace window — no redundant stop.
      expect(mockStop).not.toHaveBeenCalled();
    });

    test('clears previous force-stop timeout before setting new one', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

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
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Cancel Sleep Timer', () => {
    test('auto-cancels timer when audio stops', async () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: true, endTime: Date.now() + 120000 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1' },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { rerender } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      // Audio stops
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender(undefined);

      await waitFor(() => {
        expect(mockCancelTimer).toHaveBeenCalled();
      });
    });

    test('does not auto-cancel when audio is loading', () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: true, endTime: Date.now() + 120000 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: true, // Still loading — only ever true with a track loading
        currentTime: 0,
        duration: 0,
        currentTrack: { id: 'track-1' },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });

    test('does not auto-cancel when playback is merely paused', () => {
      // A lock-screen, headphone or phone-call pause: loaded, not playing.
      // Cancelling here lost the timer, and the playlist played on all night.
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: true, endTime: Date.now() + 120000 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1' },
        status: { playbackState: 'paused' },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      expect(mockCancelTimer).not.toHaveBeenCalled();
    });

    test('auto-cancels when a single article plays to its end', async () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: true, endTime: Date.now() + 120000 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: false,
        currentTime: 120,
        duration: 120,
        currentTrack: { id: 'track-1' },
        status: { playbackState: 'ended' },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      renderHook(() => useGlobalAudioState(), { wrapper: GlobalAudioStateProvider });

      await waitFor(() => {
        expect(mockCancelTimer).toHaveBeenCalled();
      });
    });

    test('does not auto-cancel when timer is not active', () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: false, endTime: 0 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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

    test('returns default position for single article not in playlist', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 999 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(usePlaylistScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }, { articleId: 2 }, { articleId: 3 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('calculates position from reading list queue', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 2 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(usePlaylistScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }, { articleId: 2 }, { articleId: 3 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 2,
        total: 3,
      });
    });

    test('uses playlist info when in playlist mode', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 5 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      mockGetPlaylistInfo.mockReturnValue({
        isPlaylistMode: true,
        currentIndex: 2,
        totalTracks: 10,
      });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 3, // currentIndex + 1
        total: 10,
      });
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
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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
        title: '',
        author: 'RL Author',
        category: 'RL Category',
        image_url: 'https://example.com/rl.jpg',
      });
    });

    test('falls back to track metadata when cache and reading list are empty', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: {
          id: 'track-1',
          articleId: 1,
          title: 'Track Metadata Title',
          imageUrl: 'https://example.com/track.jpg',
        },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      mockGetQueryData.mockReturnValue(null);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      // When track has title/imageUrl, uses track metadata with empty author (no cache data)
      expect(result.current.currentArticle).toEqual({
        id: 1,
        title: 'Track Metadata Title',
        author: '',
        category: '',
        image_url: 'https://example.com/track.jpg',
      });
    });

    test('preserves last valid article during transitions (flicker prevention)', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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

      // Transition to loading state (currentTrack becomes null temporarily)
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender(undefined);

      // Should preserve last valid article (no flicker)
      expect(result.current.currentArticle).toEqual(validArticle);
    });

    test('clears last valid article when truly stopped', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

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
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender(undefined);

      // Should clear article
      expect(result.current.currentArticle).toBeNull();
    });
  });

  describe('Memory Management', () => {
    test('cleans up force-stop timeout on unmount', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, endTime: Date.now() + 60000 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
          },
        } as any;
      });

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
      expect(mockStop).not.toHaveBeenCalled();
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

    test('handles empty reading list', () => {
      jest.mocked(usePlaylistScreen).mockReturnValue({
        sortedEnhancedTracks: [],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('handles single-item reading list', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(usePlaylistScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('handles invalid article ID (non-numeric)', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 'invalid' as any },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toBeNull();
    });

    test('handles null article ID', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        playing: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: null },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toBeNull();
    });
  });
});
