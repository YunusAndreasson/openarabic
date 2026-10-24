/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * useSimpleAudioPlayer Hook Tests
 *
 * Tests the audio player hook that manages:
 * - Audio playback (play, stop)
 * - Seeking to position
 * - Audio session configuration
 * - Status readings (playing, isLoading, currentTrack)
 *
 * Deliberately no currentTime / duration: this hook reads the service's
 * transport channel, which does not deliver play-head ticks, so exposing a
 * position here would hand callers a number that silently stops advancing.
 * The clock lives in useAudioProgress.
 * - Mount safety (prevent calls after unmount)
 *
 * The status is read through the real useAudioSelector, so these tests drive
 * it the way the service does: what getStatus() returns, plus a notification.
 */

import { renderHook, act } from '@testing-library/react-native';

import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import type { AudioStatus } from '@/services/audioPlayer';
import { simpleAudioService } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { createAudioStatusMock } from '@/__tests__/helpers/serviceMocks';

// Mock dependencies
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    play: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    preconfigureAudioSession: jest.fn(),
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('@/hooks/common/useMountSafety', () => ({
  useMountSafety: jest.fn(),
}));

const { useMountSafety } = require('@/hooks/common/useMountSafety');

// Test helpers
const createMockTrack = (overrides: Partial<EnhancedAudioTrack> = {}): EnhancedAudioTrack => ({
  id: 'track-1',
  audioUrl: 'https://example.com/audio/track1.mp3',
  title: 'Test Track',
  ...overrides,
});

// isLoaded defaults to true so the derived isLoading reads as false for "idle"
// baseline statuses; tests opt in to a buffering state explicitly.
const createMockStatus = (overrides: Partial<AudioStatus> = {}): AudioStatus =>
  createAudioStatusMock({ isLoaded: true, ...overrides });

describe('useSimpleAudioPlayer Hook', () => {
  let mockIsMountedRef: { current: boolean };
  let status: AudioStatus;
  // One per reading: the hook subscribes once for each value it selects.
  const listeners = new Set<(next: AudioStatus) => void>();

  /** Publish a status the way the service does: replace it, then notify. */
  const publish = (next: AudioStatus): void => {
    status = next;
    act(() => listeners.forEach(listener => listener(status)));
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock mount safety
    mockIsMountedRef = { current: true };
    useMountSafety.mockReturnValue(mockIsMountedRef);

    status = createMockStatus();
    listeners.clear();
    jest.mocked(simpleAudioService.getStatus).mockImplementation(() => status);
    jest.mocked(simpleAudioService.subscribe).mockImplementation(listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });

    // Mock service methods
    (simpleAudioService.play as jest.Mock).mockResolvedValue(true);
    (simpleAudioService.stop as jest.Mock).mockResolvedValue(true);
    (simpleAudioService.seekTo as jest.Mock).mockResolvedValue(undefined);
    (simpleAudioService.preconfigureAudioSession as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    test('should initialize with default status', () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.playing).toBeFalsy();
      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.currentTrack).toBeNull();
    });

    test('should provide all required functions', () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.seekTo).toBe('function');
      expect(typeof result.current.preconfigureAudioSession).toBe('function');
    });

    test('subscribes to the transport channel only', () => {
      renderHook(() => useSimpleAudioPlayer());

      for (const [, options] of jest.mocked(simpleAudioService.subscribe).mock.calls) {
        expect(options?.position).toBeFalsy();
      }
    });
  });

  describe('Play Function', () => {
    test('should play audio track', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      let playResult: boolean | undefined;
      await act(async () => {
        playResult = await result.current.play(track);
      });

      expect(simpleAudioService.play).toHaveBeenCalledWith(track, undefined);
      expect(playResult).toBeTruthy();
    });

    test('should return false when component unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      let playResult: boolean | undefined;
      await act(async () => {
        playResult = await result.current.play(track);
      });

      expect(simpleAudioService.play).not.toHaveBeenCalled();
      expect(playResult).toBeFalsy();
    });

    test('should play different tracks sequentially', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track1 = createMockTrack({ id: 'track-1', title: 'Track 1' });
      const track2 = createMockTrack({ id: 'track-2', title: 'Track 2' });

      await act(async () => {
        await result.current.play(track1);
        await result.current.play(track2);
      });

      expect(simpleAudioService.play).toHaveBeenCalledTimes(2);
      expect(simpleAudioService.play).toHaveBeenCalledWith(track1, undefined);
      expect(simpleAudioService.play).toHaveBeenCalledWith(track2, undefined);
    });
  });

  describe('Stop Function', () => {
    test('should stop audio playback', async () => {
      // Distinct from "should handle stop without play" below: this simulates
      // a track already in progress so the assertion actually distinguishes
      // "was playing" from the no-op case.
      status = createMockStatus({ playing: true, currentTrack: createMockTrack() });
      const { result } = renderHook(() => useSimpleAudioPlayer());
      expect(result.current.playing).toBe(true);

      let stopped: boolean | undefined;
      await act(async () => {
        stopped = await result.current.stop();
      });

      expect(simpleAudioService.stop).toHaveBeenCalled();
      expect(stopped).toBe(true);
    });

    test('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });

    test("passes on the service's verdict when a stop fails", async () => {
      (simpleAudioService.stop as jest.Mock).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.stop()).resolves.toBe(false);
    });
  });

  describe('Seek Function', () => {
    test('should seek to position', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(30);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(30);
    });

    test('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(30);
      });

      expect(simpleAudioService.seekTo).not.toHaveBeenCalled();
    });

    test('should handle seek errors', async () => {
      (simpleAudioService.seekTo as jest.Mock).mockRejectedValueOnce(new Error('Seek failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.seekTo(30)).rejects.toThrow('Seek failed');
    });
  });

  describe('Audio Session Configuration', () => {
    test('should preconfigure audio session', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(simpleAudioService.preconfigureAudioSession).toHaveBeenCalled();
    });

    test('should not preconfigure when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(simpleAudioService.preconfigureAudioSession).not.toHaveBeenCalled();
    });
  });

  describe('Status readings', () => {
    test('should reflect playing status', () => {
      status = createMockStatus({ playing: true });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.playing).toBeTruthy();
    });

    test('should reflect loading status', () => {
      status = createMockStatus({
        currentTrack: createMockTrack(),
        isLoaded: false,
        isBuffering: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isLoading).toBeTruthy();
    });

    test('an idle service is not loading, whatever isLoaded says', () => {
      // The default isLoaded: false of a fresh service must not block the very
      // first play attempt.
      status = createMockStatus({ currentTrack: null, isLoaded: false });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isLoading).toBe(false);
    });

    test('does not expose a play head', () => {
      // The transport channel never ticks currentTime, so a position read here
      // would be stale by construction. Callers that need one use
      // useAudioProgress.
      status = createMockStatus({ currentTime: 45.5, duration: 180 });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current).not.toHaveProperty('currentTime');
      expect(result.current).not.toHaveProperty('duration');
    });

    test('should update current track', () => {
      const track = createMockTrack({ id: 'track-123', title: 'Playing Track' });
      status = createMockStatus({ currentTrack: track });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.currentTrack).toBe(track);
    });

    test('should update when the service publishes a change', () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.playing).toBeFalsy();

      publish(createMockStatus({ playing: true, currentTime: 30 }));

      expect(result.current.playing).toBeTruthy();
    });

    test('does not re-render for play-head ticks', () => {
      let renders = 0;
      renderHook(() => {
        renders++;
        return useSimpleAudioPlayer();
      });
      const rendersAfterMount = renders;

      for (let i = 0; i < 100; i++) {
        publish(createMockStatus({ currentTime: i }));
      }

      expect(renders).toBe(rendersAfterMount);
    });
  });

  describe('Complete Playback Workflow', () => {
    test('should handle play → seek → stop workflow', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await act(async () => {
        await result.current.play(track);
        await result.current.seekTo(60);
        await result.current.stop();
      });

      expect(simpleAudioService.play).toHaveBeenCalledWith(track, undefined);
      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(60);
      expect(simpleAudioService.stop).toHaveBeenCalled();
    });
  });

  describe('Mount Safety', () => {
    test('should check mount status before each call', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await act(async () => {
        await result.current.play(track);
        await result.current.stop();
        await result.current.seekTo(30);
        await result.current.preconfigureAudioSession();
      });

      // None of these should call the service when unmounted
      expect(simpleAudioService.play).not.toHaveBeenCalled();
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
      expect(simpleAudioService.seekTo).not.toHaveBeenCalled();
      expect(simpleAudioService.preconfigureAudioSession).not.toHaveBeenCalled();
    });

    test('should become unmounted during operation', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      // Start operation while mounted
      mockIsMountedRef.current = true;
      await act(async () => {
        await result.current.play(track);
      });
      expect(simpleAudioService.play).toHaveBeenCalled();

      // Become unmounted
      mockIsMountedRef.current = false;
      await act(async () => {
        await result.current.stop();
      });
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle stop without play', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(simpleAudioService.stop).toHaveBeenCalled();
    });
  });
});
