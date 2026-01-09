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

// Mock dependencies BEFORE imports
jest.mock('@/hooks/common/useMountSafety', () => ({
  useMountSafety: jest.fn(),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

import { useAudioSubscription } from '@/hooks/audio/useAudioSubscription';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { simpleAudioService } from '@/services/audioPlayer';
import type { AudioStatus } from '@/services/audioPlayer';

const mockUseMountSafety = jest.mocked(useMountSafety);
const mockSimpleAudioService = jest.mocked(simpleAudioService);

describe('useAudioSubscription', () => {
  const mockInitialStatus: AudioStatus = {
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
  };

  let subscribeCallback: ((status: AudioStatus) => void) | null = null;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    subscribeCallback = null;

    // Default mount safety - component is mounted
    mockUseMountSafety.mockReturnValue({ current: true });

    // Default audio service mocks
    mockSimpleAudioService.getStatus.mockReturnValue(mockInitialStatus);
    mockSimpleAudioService.subscribe.mockImplementation(callback => {
      subscribeCallback = callback;
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
      expect(mockSimpleAudioService.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Status updates', () => {
    test('should update status when isPlaying changes', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        isPlaying: true,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.isPlaying).toBeTruthy();
    });

    test('should update status when isLoading changes', () => {
      const { result } = renderHook(() => useAudioSubscription());

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        isLoading: true,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      expect(result.current.status.isLoading).toBeTruthy();
    });

    test('should update status when currentTime changes by >= 0.1', () => {
      const { result } = renderHook(() => useAudioSubscription());

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

      const { result } = renderHook(() => useAudioSubscription());

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

  describe('Mount safety', () => {
    test('should not update status when component is unmounted', () => {
      const mountedRef = { current: true };
      mockUseMountSafety.mockReturnValue(mountedRef);

      const { result } = renderHook(() => useAudioSubscription());

      // Simulate unmount
      mountedRef.current = false;

      const newStatus: AudioStatus = {
        ...mockInitialStatus,
        isPlaying: true,
      };

      act(() => {
        subscribeCallback?.(newStatus);
      });

      // Status should not have changed
      expect(result.current.status.isPlaying).toBeFalsy();
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
