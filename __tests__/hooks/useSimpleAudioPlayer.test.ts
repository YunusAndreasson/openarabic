/**
 * useSimpleAudioPlayer Hook Tests
 *
 * Tests the audio player hook that manages:
 * - Audio playback (play, pause, resume, stop)
 * - Seeking to position
 * - Audio session configuration
 * - Status subscription (isPlaying, isLoading, currentTime, duration, currentTrack)
 * - Mount safety (prevent calls after unmount)
 *
 * This hook is CRITICAL for:
 * - Practice session audio (Arabic word pronunciation)
 * - Listen tab playlist playback
 * - Article audio playback
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import type { AudioStatus } from '@/services/audioPlayer';
import { simpleAudioService } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';

// Mock dependencies
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    preconfigureAudioSession: jest.fn(),
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('@/hooks/audio/useAudioSubscription', () => ({
  useAudioSubscription: jest.fn(),
}));

jest.mock('@/hooks/common/useMountSafety', () => ({
  useMountSafety: jest.fn(),
}));

const { useAudioSubscription } = require('@/hooks/audio/useAudioSubscription');
const { useMountSafety } = require('@/hooks/common/useMountSafety');

// Test helpers
const createMockTrack = (overrides: Partial<EnhancedAudioTrack> = {}): EnhancedAudioTrack => ({
  id: 'track-1',
  audioUrl: 'https://example.com/audio/track1.mp3',
  title: 'Test Track',
  duration: 120,
  ...overrides,
});

const createMockStatus = (overrides: Partial<AudioStatus> = {}): AudioStatus => ({
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  currentTrack: null,
  isLoaded: false,
  isBuffering: false,
  playbackState: 'idle',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  didJustFinish: false,
  ...overrides,
});

describe('useSimpleAudioPlayer Hook', () => {
  let mockIsMountedRef: { current: boolean };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock mount safety
    mockIsMountedRef = { current: true };
    useMountSafety.mockReturnValue(mockIsMountedRef);

    // Mock audio subscription with default status
    useAudioSubscription.mockReturnValue({
      status: createMockStatus(),
      isMounted: true,
    });

    // Mock service methods
    (simpleAudioService.play as jest.Mock).mockResolvedValue(true);
    (simpleAudioService.pause as jest.Mock).mockResolvedValue(undefined);
    (simpleAudioService.resume as jest.Mock).mockResolvedValue(undefined);
    (simpleAudioService.stop as jest.Mock).mockResolvedValue(undefined);
    (simpleAudioService.seekTo as jest.Mock).mockResolvedValue(undefined);
    (simpleAudioService.preconfigureAudioSession as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with default status', () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentTrack).toBeNull();
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.seekTo).toBe('function');
      expect(typeof result.current.preconfigureAudioSession).toBe('function');
    });

    it('should return status object', () => {
      const mockStatus = createMockStatus({ isPlaying: true });
      useAudioSubscription.mockReturnValue({
        status: mockStatus,
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.status).toEqual(mockStatus);
    });
  });

  describe('Play Function', () => {
    it('should play audio track', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      let playResult: boolean | undefined;
      await act(async () => {
        playResult = await result.current.play(track);
      });

      expect(simpleAudioService.play).toHaveBeenCalledWith(track);
      expect(playResult).toBe(true);
    });

    it('should return false when component unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      let playResult: boolean | undefined;
      await act(async () => {
        playResult = await result.current.play(track);
      });

      expect(simpleAudioService.play).not.toHaveBeenCalled();
      expect(playResult).toBe(false);
    });

    it('should handle play errors', async () => {
      (simpleAudioService.play as jest.Mock).mockRejectedValueOnce(new Error('Play failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await expect(result.current.play(track)).rejects.toThrow('Play failed');
    });

    it('should play different tracks sequentially', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track1 = createMockTrack({ id: 'track-1', title: 'Track 1' });
      const track2 = createMockTrack({ id: 'track-2', title: 'Track 2' });

      await act(async () => {
        await result.current.play(track1);
        await result.current.play(track2);
      });

      expect(simpleAudioService.play).toHaveBeenCalledTimes(2);
      expect(simpleAudioService.play).toHaveBeenCalledWith(track1);
      expect(simpleAudioService.play).toHaveBeenCalledWith(track2);
    });
  });

  describe('Pause Function', () => {
    it('should pause audio playback', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.pause();
      });

      expect(simpleAudioService.pause).toHaveBeenCalled();
    });

    it('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.pause();
      });

      expect(simpleAudioService.pause).not.toHaveBeenCalled();
    });

    it('should handle pause errors gracefully', async () => {
      (simpleAudioService.pause as jest.Mock).mockRejectedValueOnce(new Error('Pause failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.pause()).rejects.toThrow('Pause failed');
    });
  });

  describe('Resume Function', () => {
    it('should resume audio playback', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.resume();
      });

      expect(simpleAudioService.resume).toHaveBeenCalled();
    });

    it('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.resume();
      });

      expect(simpleAudioService.resume).not.toHaveBeenCalled();
    });

    it('should handle resume errors', async () => {
      (simpleAudioService.resume as jest.Mock).mockRejectedValueOnce(new Error('Resume failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.resume()).rejects.toThrow('Resume failed');
    });
  });

  describe('Stop Function', () => {
    it('should stop audio playback', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(simpleAudioService.stop).toHaveBeenCalled();
    });

    it('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(simpleAudioService.stop).not.toHaveBeenCalled();
    });

    it('should handle stop errors', async () => {
      (simpleAudioService.stop as jest.Mock).mockRejectedValueOnce(new Error('Stop failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.stop()).rejects.toThrow('Stop failed');
    });
  });

  describe('Seek Function', () => {
    it('should seek to position', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(30);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(30);
    });

    it('should not call service when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(30);
      });

      expect(simpleAudioService.seekTo).not.toHaveBeenCalled();
    });

    it('should seek to beginning', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(0);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(0);
    });

    it('should seek to end', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(120);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(120);
    });

    it('should handle seek errors', async () => {
      (simpleAudioService.seekTo as jest.Mock).mockRejectedValueOnce(new Error('Seek failed'));

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.seekTo(30)).rejects.toThrow('Seek failed');
    });
  });

  describe('Audio Session Configuration', () => {
    it('should preconfigure audio session', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(simpleAudioService.preconfigureAudioSession).toHaveBeenCalled();
    });

    it('should not preconfigure when unmounted', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.preconfigureAudioSession();
      });

      expect(simpleAudioService.preconfigureAudioSession).not.toHaveBeenCalled();
    });

    it('should handle preconfiguration errors', async () => {
      (simpleAudioService.preconfigureAudioSession as jest.Mock).mockRejectedValueOnce(
        new Error('Config failed'),
      );

      const { result } = renderHook(() => useSimpleAudioPlayer());

      await expect(result.current.preconfigureAudioSession()).rejects.toThrow('Config failed');
    });
  });

  describe('Status Subscription', () => {
    it('should reflect playing status', () => {
      useAudioSubscription.mockReturnValue({
        status: createMockStatus({ isPlaying: true }),
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(true);
    });

    it('should reflect loading status', () => {
      useAudioSubscription.mockReturnValue({
        status: createMockStatus({ isLoading: true }),
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isLoading).toBe(true);
    });

    it('should update current time', () => {
      useAudioSubscription.mockReturnValue({
        status: createMockStatus({ currentTime: 45.5 }),
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.currentTime).toBe(45.5);
    });

    it('should update duration', () => {
      useAudioSubscription.mockReturnValue({
        status: createMockStatus({ duration: 180 }),
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.duration).toBe(180);
    });

    it('should update current track', () => {
      const track = createMockTrack({ id: 'track-123', title: 'Playing Track' });
      useAudioSubscription.mockReturnValue({
        status: createMockStatus({ currentTrack: track }),
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.currentTrack).toEqual(track);
    });

    it('should provide safe defaults when status is null', () => {
      useAudioSubscription.mockReturnValue({
        status: null,
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentTrack).toBeNull();
    });

    it('should update when status changes', () => {
      const initialStatus = createMockStatus({ isPlaying: false, currentTime: 0 });
      useAudioSubscription.mockReturnValue({
        status: initialStatus,
        isMounted: true,
      });

      const { result, rerender } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);

      // Update status
      const updatedStatus = createMockStatus({ isPlaying: true, currentTime: 30 });
      useAudioSubscription.mockReturnValue({
        status: updatedStatus,
        isMounted: true,
      });

      rerender();

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTime).toBe(30);
    });
  });

  describe('Complete Playback Workflow', () => {
    it('should handle play → pause → resume → stop workflow', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      // Play
      await act(async () => {
        await result.current.play(track);
      });
      expect(simpleAudioService.play).toHaveBeenCalledWith(track);

      // Pause
      await act(async () => {
        await result.current.pause();
      });
      expect(simpleAudioService.pause).toHaveBeenCalled();

      // Resume
      await act(async () => {
        await result.current.resume();
      });
      expect(simpleAudioService.resume).toHaveBeenCalled();

      // Stop
      await act(async () => {
        await result.current.stop();
      });
      expect(simpleAudioService.stop).toHaveBeenCalled();
    });

    it('should handle play → seek → pause workflow', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await act(async () => {
        await result.current.play(track);
        await result.current.seekTo(60);
        await result.current.pause();
      });

      expect(simpleAudioService.play).toHaveBeenCalledWith(track);
      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(60);
      expect(simpleAudioService.pause).toHaveBeenCalled();
    });
  });

  describe('Mount Safety', () => {
    it('should check mount status before each call', async () => {
      mockIsMountedRef.current = false;

      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await act(async () => {
        await result.current.play(track);
        await result.current.pause();
        await result.current.resume();
        await result.current.stop();
        await result.current.seekTo(30);
        await result.current.preconfigureAudioSession();
      });

      // None of these should call the service when unmounted
      expect(simpleAudioService.play).not.toHaveBeenCalled();
      expect(simpleAudioService.pause).not.toHaveBeenCalled();
      expect(simpleAudioService.resume).not.toHaveBeenCalled();
      expect(simpleAudioService.stop).not.toHaveBeenCalled();
      expect(simpleAudioService.seekTo).not.toHaveBeenCalled();
      expect(simpleAudioService.preconfigureAudioSession).not.toHaveBeenCalled();
    });

    it('should become unmounted during operation', async () => {
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
        await result.current.pause();
      });
      expect(simpleAudioService.pause).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty audio URL', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack({ audioUrl: '' });

      await act(async () => {
        await result.current.play(track);
      });

      expect(simpleAudioService.play).toHaveBeenCalledWith(track);
    });

    it('should handle invalid seek position (negative)', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(-10);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(-10);
    });

    it('should handle seek beyond duration', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.seekTo(9999);
      });

      expect(simpleAudioService.seekTo).toHaveBeenCalledWith(9999);
    });

    it('should handle rapid play calls', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });
      const track3 = createMockTrack({ id: 'track-3' });

      await act(async () => {
        await Promise.all([
          result.current.play(track1),
          result.current.play(track2),
          result.current.play(track3),
        ]);
      });

      expect(simpleAudioService.play).toHaveBeenCalledTimes(3);
    });

    it('should handle pause without play', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.pause();
      });

      expect(simpleAudioService.pause).toHaveBeenCalled();
    });

    it('should handle resume without play', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.resume();
      });

      expect(simpleAudioService.resume).toHaveBeenCalled();
    });

    it('should handle stop without play', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());

      await act(async () => {
        await result.current.stop();
      });

      expect(simpleAudioService.stop).toHaveBeenCalled();
    });
  });

  describe('Status Properties', () => {
    it('should expose all status properties', () => {
      const fullStatus = createMockStatus({
        isPlaying: true,
        isLoading: false,
        currentTime: 45,
        duration: 180,
        currentTrack: createMockTrack(),
        isLoaded: true,
        isBuffering: false,
        playbackState: 'playing',
        timeControlStatus: 'playing',
      });

      useAudioSubscription.mockReturnValue({
        status: fullStatus,
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentTime).toBe(45);
      expect(result.current.duration).toBe(180);
      expect(result.current.currentTrack).toEqual(fullStatus.currentTrack);
      expect(result.current.status).toEqual(fullStatus);
    });

    it('should handle partial status updates', () => {
      const partialStatus = createMockStatus({
        isPlaying: true,
        // Other fields use defaults
      });

      useAudioSubscription.mockReturnValue({
        status: partialStatus,
        isMounted: true,
      });

      const { result } = renderHook(() => useSimpleAudioPlayer());

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentTime).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid status updates', () => {
      const { rerender } = renderHook(() => useSimpleAudioPlayer());

      // Simulate rapid status updates
      for (let i = 0; i < 100; i++) {
        useAudioSubscription.mockReturnValue({
          status: createMockStatus({ currentTime: i }),
          isMounted: true,
        });
        rerender();
      }

      // Should not crash or throw
      expect(true).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useSimpleAudioPlayer());
      const track = createMockTrack();

      await act(async () => {
        await Promise.all([
          result.current.play(track),
          result.current.seekTo(30),
          result.current.pause(),
        ]);
      });

      // All operations should complete
      expect(simpleAudioService.play).toHaveBeenCalled();
      expect(simpleAudioService.seekTo).toHaveBeenCalled();
      expect(simpleAudioService.pause).toHaveBeenCalled();
    });
  });
});
