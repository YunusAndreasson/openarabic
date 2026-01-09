/**
 * Hook Tests - useGlobalAudioState
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock dependencies BEFORE imports
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock('@/hooks/audio/useSimpleAudioPlayer', () => ({
  useSimpleAudioPlayer: jest.fn(),
}));

jest.mock('@/hooks/audio/useSleepTimer', () => ({
  useSleepTimer: jest.fn(),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/playlist/usePlaylistScreen', () => ({
  usePlaylistScreen: jest.fn(),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    markSleepTimerExpired: jest.fn(),
    getPlaylistInfo: jest.fn(),
    preconfigureAudioSession: jest.fn(),
  },
}));

jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

import { useQueryClient } from '@tanstack/react-query';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlaylistScreen } from '@/hooks/playlist/usePlaylistScreen';
import { simpleAudioService } from '@/services/audioPlayer';

const mockUseQueryClient = jest.mocked(useQueryClient);
const mockUseSimpleAudioPlayer = jest.mocked(useSimpleAudioPlayer);
const mockUseSleepTimer = jest.mocked(useSleepTimer);
const mockUseAuth = jest.mocked(useAuth);
const mockUsePlaylistScreen = jest.mocked(usePlaylistScreen);
const mockSimpleAudioService = jest.mocked(simpleAudioService);

describe('useGlobalAudioState', () => {
  const mockQueryClient = {
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  };

  const mockAudioPlayer = {
    isPlaying: false,
    audioState: 'idle',
    isLoading: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    preconfigureAudioSession: jest.fn().mockResolvedValue(undefined),
  };

  const mockSleepTimer = {
    state: {
      isActive: false,
      remainingTime: 0,
    },
    actions: {
      startTimer: jest.fn(),
      cancelTimer: jest.fn(),
      autoCancel: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset query client mock after clearAllMocks
    mockUseQueryClient.mockReturnValue(mockQueryClient as never);

    mockUseSimpleAudioPlayer.mockReturnValue(mockAudioPlayer as never);
    mockUseSleepTimer.mockReturnValue(mockSleepTimer);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      isLoading: false,
      authError: null,
      refreshSession: jest.fn(),
      isAuthenticated: true,
    } as never);
    mockUsePlaylistScreen.mockReturnValue({
      sortedEnhancedTracks: [],
      isLoading: false,
    } as never);
    mockSimpleAudioService.getPlaylistInfo.mockReturnValue({
      isPlaylistMode: false,
      currentIndex: 0,
      totalTracks: 0,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    test('should return initial audio state', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.audioState).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.position).toBe(0);
      expect(result.current.duration).toBe(0);
    });

    test('should return null currentArticle when no track is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.currentArticle).toBeNull();
    });

    test('should return initial sleep timer state', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.showSleepTimerModal).toBe(false);
      expect(result.current.isTimerActive).toBe(false);
      expect(result.current.sleepTimerRemainingTime).toBe(0);
    });
  });

  describe('Queue position', () => {
    test('should return correct queue position', () => {
      mockSimpleAudioService.getPlaylistInfo.mockReturnValue({
        isPlaylistMode: true,
        currentIndex: 2,
        totalTracks: 5,
      });

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.queuePosition.current).toBe(3); // 1-indexed
      expect(result.current.queuePosition.total).toBe(5);
    });
  });

  describe('Actions', () => {
    test('should provide onPlayPause action', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      expect(typeof result.current.onPlayPause).toBe('function');
    });

    test('should provide onTimerPress action that opens modal', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      act(() => {
        result.current.onTimerPress();
      });

      expect(result.current.showSleepTimerModal).toBe(true);
    });

    test('should provide onSleepTimerClose action that closes modal', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      // Open modal first
      act(() => {
        result.current.onTimerPress();
      });

      expect(result.current.showSleepTimerModal).toBe(true);

      // Close modal
      act(() => {
        result.current.onSleepTimerClose();
      });

      expect(result.current.showSleepTimerModal).toBe(false);
    });

    test('should provide onSleepTimerSet action', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      act(() => {
        result.current.onSleepTimerSet(30);
      });

      expect(mockSleepTimer.actions.startTimer).toHaveBeenCalledWith(30);
    });

    test('should provide onSleepTimerCancel action', () => {
      const { result } = renderHook(() => useGlobalAudioState());

      act(() => {
        result.current.onSleepTimerCancel();
      });

      expect(mockSleepTimer.actions.cancelTimer).toHaveBeenCalled();
    });

    test('should provide preconfigureAudioSession action', async () => {
      const { result } = renderHook(() => useGlobalAudioState());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(mockAudioPlayer.preconfigureAudioSession).toHaveBeenCalled();
    });
  });

  describe('Current article mapping', () => {
    test('should map currentTrack to MiniPlayer format', () => {
      const mockTrack = {
        id: 'track-1',
        articleId: 123,
        title: 'Test Article',
        imageUrl: 'https://example.com/image.jpg',
      };

      mockUseSimpleAudioPlayer.mockReturnValue({
        ...mockAudioPlayer,
        currentTrack: mockTrack,
        isPlaying: true, // Mark as playing so article is shown
      } as never);

      const { result } = renderHook(() => useGlobalAudioState());

      // When playing with track metadata, it shows article from track data
      expect(result.current.currentArticle).toEqual({
        id: 123,
        title: 'Test Article',
        author: '', // No author in track metadata, defaults to empty
        category: '',
        image_url: 'https://example.com/image.jpg',
      });
    });
  });

  describe('Sleep timer integration', () => {
    test('should reflect sleep timer active state', () => {
      mockUseSleepTimer.mockReturnValue({
        state: {
          isActive: true,
          remainingTime: 1800, // 30 minutes in seconds
        },
        actions: mockSleepTimer.actions,
      });

      const { result } = renderHook(() => useGlobalAudioState());

      expect(result.current.isTimerActive).toBe(true);
      expect(result.current.sleepTimerRemainingTime).toBe(1800);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup timeout on unmount', () => {
      const { unmount } = renderHook(() => useGlobalAudioState());

      unmount();

      // No errors should occur during cleanup
    });
  });
});
