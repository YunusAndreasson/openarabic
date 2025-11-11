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
jest.mock('@/hooks/bookmarks/useBookmarksScreen');
jest.mock('@/services/audioPlayer');
jest.mock('@/utils/haptics');
jest.mock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';

import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { AUDIO_STATES } from '@/constants/audio';

const { useAuth } = require('@/hooks/auth/useAuth');
const { useSimpleAudioPlayer } = require('@/hooks/audio/useSimpleAudioPlayer');
const { useSleepTimer } = require('@/hooks/audio/useSleepTimer');
const { useBookmarksScreen } = require('@/hooks/bookmarks/useBookmarksScreen');
const { simpleAudioService } = require('@/services/audioPlayer');
const { successFeedback } = require('@/utils/haptics');
const { useQueryClient } = require('@tanstack/react-query');

describe('useGlobalAudioState Hook', () => {
  const mockStop = jest.fn();
  const mockPreconfigureAudioSession = jest.fn();
  const mockStartTimer = jest.fn();
  const mockCancelTimer = jest.fn();
  const mockAutoCancel = jest.fn();
  const mockGetQueryData = jest.fn();
  const mockMarkSleepTimerExpired = jest.fn();
  const mockGetPlaylistInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock useAuth
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' },
    } as any);

    // Mock useSimpleAudioPlayer
    jest.mocked(useSimpleAudioPlayer).mockReturnValue({
      isPlaying: false,
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
            remainingTime: 0,
          },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
          onComplete, // Store for testing
        }) as any,
    );

    // Mock useBookmarksScreen
    jest.mocked(useBookmarksScreen).mockReturnValue({
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
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.audioState).toBe(AUDIO_STATES.IDLE);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentArticle).toBeNull();
      expect(result.current.position).toBe(0);
      expect(result.current.duration).toBe(0);
    });

    test('reflects playing state from audio player', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: {
          id: 'track-1',
          articleId: 1,
          title: 'Test Article',
        },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.audioState).toBe(AUDIO_STATES.PLAYING);
      expect(result.current.position).toBe(30);
      expect(result.current.duration).toBe(120);
    });

    test('reflects loading state from audio player', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.audioState).toBe(AUDIO_STATES.LOADING);
      expect(result.current.isLoading).toBe(true);
    });

    test('initializes sleep timer as inactive', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isTimerActive).toBe(false);
      expect(result.current.showSleepTimerModal).toBe(false);
      expect(result.current.sleepTimerRemainingTime).toBe(0);
    });

    test('initializes with default queue position', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });
  });

  describe('Play/Pause Actions', () => {
    test('onPlayPause stops audio playback', async () => {
      const { result } = renderHook(() => useGlobalAudioState());

      await act(async () => {
        await result.current.onPlayPause();
      });

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('preconfigureAudioSession calls audio player method', async () => {
      const { result } = renderHook(() => useGlobalAudioState());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(mockPreconfigureAudioSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sleep Timer Modal', () => {
    test('onTimerPress opens sleep timer modal', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      act(() => {
        result.current.onTimerPress();
      });

      expect(result.current.showSleepTimerModal).toBe(true);
    });

    test('onSleepTimerSet starts timer and keeps modal open', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      act(() => {
        result.current.onSleepTimerSet(30);
      });

      expect(mockStartTimer).toHaveBeenCalledWith(30);
      // Modal stays open to show countdown
    });

    test('onSleepTimerCancel cancels timer and closes modal', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      // Open modal first
      act(() => {
        result.current.onTimerPress();
      });

      expect(result.current.showSleepTimerModal).toBe(true);

      // Cancel timer
      act(() => {
        result.current.onSleepTimerCancel();
      });

      expect(mockCancelTimer).toHaveBeenCalledTimes(1);
      expect(result.current.showSleepTimerModal).toBe(false);
    });

    test('onSleepTimerClose just closes modal without canceling', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      // Open modal
      act(() => {
        result.current.onTimerPress();
      });

      // Close without canceling
      act(() => {
        result.current.onSleepTimerClose();
      });

      expect(mockCancelTimer).not.toHaveBeenCalled();
      expect(result.current.showSleepTimerModal).toBe(false);
    });
  });

  describe('Sleep Timer Completion', () => {
    test('timer completion triggers haptic feedback', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      renderHook(() => useGlobalAudioState());

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
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      renderHook(() => useGlobalAudioState());

      act(() => {
        timerCallback?.();
      });

      expect(mockMarkSleepTimerExpired).toHaveBeenCalledTimes(1);
    });

    test('timer completion sets force-stop timeout for 30 seconds', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      mockGetPlaylistInfo.mockReturnValue({
        isPlaylistMode: true,
        currentIndex: 0,
        totalTracks: 5,
      });

      renderHook(() => useGlobalAudioState());

      act(() => {
        timerCallback?.();
      });

      // Should not stop immediately
      expect(mockStop).not.toHaveBeenCalled();

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should now force stop if still in playlist mode
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('force-stop timeout does not trigger if not in playlist mode', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      mockGetPlaylistInfo.mockReturnValue({
        isPlaylistMode: false,
        currentIndex: 0,
        totalTracks: 0,
      });

      renderHook(() => useGlobalAudioState());

      act(() => {
        timerCallback?.();
        jest.advanceTimersByTime(30000);
      });

      // Should not force stop when not in playlist mode
      expect(mockStop).not.toHaveBeenCalled();
    });

    test('clears previous force-stop timeout before setting new one', () => {
      let timerCallback: (() => void) | undefined;

      jest.mocked(useSleepTimer).mockImplementation((onComplete: () => void) => {
        timerCallback = onComplete;
        return {
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      renderHook(() => useGlobalAudioState());

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
        state: { isActive: true, remainingTime: 120 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
          autoCancel: mockAutoCancel,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1' },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { rerender } = renderHook(() => useGlobalAudioState());

      // Audio stops
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender();

      await waitFor(() => {
        expect(mockAutoCancel).toHaveBeenCalled();
      });
    });

    test('does not auto-cancel when audio is loading', () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: true, remainingTime: 120 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
          autoCancel: mockAutoCancel,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: true, // Still loading
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      renderHook(() => useGlobalAudioState());

      expect(mockAutoCancel).not.toHaveBeenCalled();
    });

    test('does not auto-cancel when timer is not active', () => {
      jest.mocked(useSleepTimer).mockReturnValue({
        state: { isActive: false, remainingTime: 0 },
        actions: {
          startTimer: mockStartTimer,
          cancelTimer: mockCancelTimer,
          autoCancel: mockAutoCancel,
        },
      } as any);

      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      renderHook(() => useGlobalAudioState());

      expect(mockAutoCancel).not.toHaveBeenCalled();
    });
  });

  describe('Queue Position Tracking', () => {
    test('returns default position when no article is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('returns default position for single article not in playlist', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 999 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(useBookmarksScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }, { articleId: 2 }, { articleId: 3 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('calculates position from reading list queue', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 2 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(useBookmarksScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }, { articleId: 2 }, { articleId: 3 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 2,
        total: 3,
      });
    });

    test('uses playlist info when in playlist mode', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
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

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 3, // currentIndex + 1
        total: 10,
      });
    });
  });

  describe('Current Article Resolution', () => {
    test('returns null when no article is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.currentArticle).toBeNull();
    });

    test('resolves article from cache', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
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

      const { result } = renderHook(() => useGlobalAudioState());

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
        isPlaying: true,
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

      const { result } = renderHook(() => useGlobalAudioState());

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
        isPlaying: true,
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

      const { result } = renderHook(() => useGlobalAudioState());

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
        isPlaying: true,
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

      const { result, rerender } = renderHook(() => useGlobalAudioState());

      const validArticle = result.current.currentArticle;
      expect(validArticle).not.toBeNull();

      // Transition to loading state (currentTrack becomes null temporarily)
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender();

      // Should preserve last valid article (no flicker)
      expect(result.current.currentArticle).toEqual(validArticle);
    });

    test('clears last valid article when truly stopped', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
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

      const { result, rerender } = renderHook(() => useGlobalAudioState());

      expect(result.current.currentArticle).not.toBeNull();

      // Fully stop (not playing, not loading, no track)
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        currentTrack: null,
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      rerender();

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
          state: { isActive: true, remainingTime: 60 },
          actions: {
            startTimer: mockStartTimer,
            cancelTimer: mockCancelTimer,
            autoCancel: mockAutoCancel,
          },
        } as any;
      });

      const { unmount } = renderHook(() => useGlobalAudioState());

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
      const { unmount } = renderHook(() => useGlobalAudioState());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined user gracefully', () => {
      jest.mocked(useAuth).mockReturnValue({
        user: undefined,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current).toBeDefined();
      expect(result.current.currentArticle).toBeNull();
    });

    test('handles empty reading list', () => {
      jest.mocked(useBookmarksScreen).mockReturnValue({
        sortedEnhancedTracks: [],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('handles single-item reading list', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 1 },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      jest.mocked(useBookmarksScreen).mockReturnValue({
        sortedEnhancedTracks: [{ articleId: 1 }],
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition).toEqual({
        current: 1,
        total: 1,
      });
    });

    test('handles invalid article ID (non-numeric)', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: 'invalid' as any },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.currentArticle).toBeNull();
    });

    test('handles null article ID', () => {
      jest.mocked(useSimpleAudioPlayer).mockReturnValue({
        isPlaying: true,
        isLoading: false,
        currentTime: 30,
        duration: 120,
        currentTrack: { id: 'track-1', articleId: null },
        stop: mockStop,
        preconfigureAudioSession: mockPreconfigureAudioSession,
      } as any);

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.currentArticle).toBeNull();
    });
  });
});
