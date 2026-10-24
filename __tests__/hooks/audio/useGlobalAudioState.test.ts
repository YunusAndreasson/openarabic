/**
 * Hook Tests - useGlobalAudioState
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 *
 * The provider reads the service's status through useAudioSelector, so state
 * is driven here by what the mocked service's getStatus() returns.
 */

import { describe, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';

// Mock dependencies BEFORE imports. The real module otherwise: the query
// factories the provider takes its cache keys from are built with it.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<object>('@tanstack/react-query'),
  useQueryClient: jest.fn((..._args: unknown[]) => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock('@/hooks/audio/useSleepTimer', () => ({
  useSleepTimer: jest.fn(),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    markSleepTimerExpired: jest.fn(),
    getPlaylistInfo: jest.fn(),
    preconfigureAudioSession: jest.fn(),
    getStatus: jest.fn(),
    subscribe: jest.fn((..._args: unknown[]) => jest.fn()),
    togglePause: jest.fn(async (..._args: unknown[]) => true),
    stop: jest.fn(async (..._args: unknown[]) => true),
  },
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

import { useQueryClient } from '@tanstack/react-query';
import {
  GlobalAudioStateProvider,
  useAudioProgress,
  useGlobalAudioState,
} from '@/hooks/audio/useGlobalAudioState';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { simpleAudioService } from '@/services/audioPlayer';
import { articleId } from '@/__tests__/helpers/ids';
import { createAudioStatusMock } from '@/__tests__/helpers/serviceMocks';

const mockUseQueryClient = jest.mocked(useQueryClient);
const mockUseSleepTimer = jest.mocked(useSleepTimer);
const mockUseAuth = jest.mocked(useAuth);
const mockSimpleAudioService = jest.mocked(simpleAudioService);

describe('useGlobalAudioState', () => {
  const mockQueryClient = {
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  };

  const mockSleepTimer = {
    state: {
      isActive: false,
      endTime: 0,
    },
    actions: {
      startTimer: jest.fn(),
      cancelTimer: jest.fn(),
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

    mockUseSleepTimer.mockReturnValue(mockSleepTimer);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      isLoading: false,
      authError: null,
      refreshSession: jest.fn(),
      isAuthenticated: true,
    } as never);
    mockSimpleAudioService.getStatus.mockReturnValue(createAudioStatusMock());
    mockSimpleAudioService.subscribe.mockReturnValue(jest.fn());
    mockSimpleAudioService.togglePause.mockResolvedValue(true);
    mockSimpleAudioService.stop.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    test('should return initial audio state', () => {
      const { result } = renderHook(() => ({ ...useGlobalAudioState(), ...useAudioProgress() }), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.playing).toBeFalsy();
      expect(result.current.audioState).toBe('idle');
      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.position).toBe(0);
      expect(result.current.duration).toBe(0);
    });

    test('should return null currentArticle when no track is playing', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.currentArticle).toBeNull();
    });

    test('should return initial sleep timer state', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.isTimerActive).toBeFalsy();
      expect(result.current.sleepTimerEndTime).toBe(0);
    });
  });

  describe('Queue position', () => {
    test('is the position the service publishes for its queue', () => {
      mockSimpleAudioService.getStatus.mockReturnValue(
        createAudioStatusMock({ queue: { index: 2, total: 5 } }),
      );

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition.current).toBe(3); // 1-indexed
      expect(result.current.queuePosition.total).toBe(5);
    });

    test('is 1 of 1 outside a queue', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.queuePosition).toEqual({ current: 1, total: 1 });
    });
  });

  describe('Actions', () => {
    test('onTogglePause hands the toggle to the service', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onTogglePause();
      });

      // Pause or resume is the service's call: it alone knows a loading track
      // from a paused one, and it reports its own failures.
      expect(mockSimpleAudioService.togglePause).toHaveBeenCalledTimes(1);
      expect(mockSimpleAudioService.stop).not.toHaveBeenCalled();
    });

    test('onStop stops playback and clears the queue', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onStop();
      });

      expect(mockSimpleAudioService.stop).toHaveBeenCalledTimes(1);
    });

    test('should provide onTimerPress that navigates to the sleep-timer route', () => {
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

    test('should provide onSleepTimerSet action', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onSleepTimerSet(30);
      });

      expect(mockSleepTimer.actions.startTimer).toHaveBeenCalledWith(30);
    });

    test('should provide onSleepTimerCancel action', () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      act(() => {
        result.current.onSleepTimerCancel();
      });

      expect(mockSleepTimer.actions.cancelTimer).toHaveBeenCalled();
    });

    test('should provide preconfigureAudioSession action', async () => {
      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(mockSimpleAudioService.preconfigureAudioSession).toHaveBeenCalled();
    });
  });

  describe('Current article mapping', () => {
    test('should map currentTrack to MiniPlayer format', () => {
      mockSimpleAudioService.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {
            id: 'track-1',
            articleId: articleId(123),
            audioUrl: 'https://example.com/audio.mp3',
            title: 'Test Article',
            imageUrl: 'https://example.com/image.jpg',
          },
          playing: true, // Mark as playing so article is shown
          isLoaded: true,
        }),
      );

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

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
          endTime: Date.now() + 1800 * 1000, // 30 minutes from now
        },
        actions: mockSleepTimer.actions,
      });

      const { result } = renderHook(() => useGlobalAudioState(), {
        wrapper: GlobalAudioStateProvider,
      });

      expect(result.current.isTimerActive).toBeTruthy();
      expect(result.current.sleepTimerEndTime).toBeGreaterThan(0);
    });
  });
});
