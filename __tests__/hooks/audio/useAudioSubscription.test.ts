/**
 * Hook Tests - useAudioSubscription
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

import {
  useAudioProgressSubscription,
  useAudioSubscription,
} from '@/hooks/audio/useAudioSubscription';
import { simpleAudioService } from '@/services/audioPlayer';
import type { AudioStatus } from '@/services/audioPlayer';

const mockSimpleAudioService = jest.mocked(simpleAudioService);

describe('useAudioSubscription', () => {
  const mockInitialStatus: AudioStatus = {
    playing: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
    isLoaded: true,
    isBuffering: false,
    playbackState: 'idle',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: '',
    didJustFinish: false,
    error: null,
  };

  let subscribeCallback: ((status: AudioStatus) => void) | null = null;
  /** The `{ position }` flag the hook asked the service for. */
  let subscribeOptions: { position?: boolean } | undefined;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    subscribeCallback = null;
    subscribeOptions = undefined;

    // Default audio service mocks
    mockSimpleAudioService.getStatus.mockReturnValue(mockInitialStatus);
    mockSimpleAudioService.subscribe.mockImplementation((callback, options) => {
      subscribeCallback = callback;
      subscribeOptions = options;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    subscribeCallback = null;
  });

  describe('Initialization', () => {
    test('should return initial status from audio service', () => {
      const { result } = renderHook(() => useAudioSubscription());

      expect(result.current.status).toEqual(mockInitialStatus);
    });

    test('should subscribe to audio service on mount', () => {
      renderHook(() => useAudioSubscription());

      expect(mockSimpleAudioService.subscribe).toHaveBeenCalledTimes(1);
      expect(mockSimpleAudioService.subscribe).toHaveBeenCalledWith(expect.any(Function), {
        position: false,
      });
    });

    test('does NOT ask the service for play-head ticks', () => {
      // The review lane runs its player at a 100 ms status interval so the mic
      // gate sees didJustFinish quickly. Every consumer of this hook used to
      // re-render on each of those ticks; the transport channel is what stops
      // that, and it only works if the hook actually opts out.
      renderHook(() => useAudioSubscription());

      expect(subscribeOptions).toEqual({ position: false });
    });

    test('the progress variant opts in to play-head ticks', () => {
      renderHook(() => useAudioProgressSubscription());

      expect(subscribeOptions).toEqual({ position: true });
    });
  });

  describe('Status updates', () => {
    test('should update status when playing changes', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        playing: true,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.playing).toBeTruthy();
    });

    test('should update status when buffering changes', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        isLoaded: false,
        isBuffering: true,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.isBuffering).toBeTruthy();
      expect(result.current.status.isLoaded).toBeFalsy();
    });

    test('should update status when currentTime changes by >= 0.1', () => {
      const { result } = renderHook(() => useAudioProgressSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        currentTime: 0.5,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.currentTime).toBe(0.5);
    });

    test('should NOT update status when currentTime changes by < 0.1', () => {
      mockSimpleAudioService.getStatus.mockReturnValue({
        ...mockInitialStatus,
        currentTime: 1.0,
      });

      const { result } = renderHook(() => useAudioProgressSubscription());

      const initialTime = result.current.status.currentTime;

      // Small change that shouldn't trigger update
      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        currentTime: 1.05,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      // Status should remain unchanged
      expect(result.current.status.currentTime).toBe(initialTime);
    });

    test('should update status when track changes', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        currentTrack: {
          id: 123,
          title: 'Test Track',
          audioUrl: 'https://example.com/audio.mp3',
        },
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.currentTrack?.id).toBe(123);
    });
  });

  describe('Cleanup', () => {
    test('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useAudioSubscription());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Change detection optimization', () => {
    test('should not trigger re-render when status is unchanged', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const initialStatus = result.current.status;

      // Send same status
      act(() => {
        subscribeCallback?.(mockInitialStatus);
      });

      // Should be the same reference (no re-render)
      expect(result.current.status).toBe(initialStatus);
    });
  });
});
