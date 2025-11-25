/**
 * Audio Player Service Tests
 *
 * Tests the SimpleAudioService class which manages all audio playback in the app.
 * Covers:
 * - Single track playback (play, stop, seekTo)
 * - Playlist mode with automatic track advancement
 * - Audio session configuration and error recovery
 * - Event subscriptions and status updates
 * - Sleep timer integration
 * - Background audio handling
 * - Memory cleanup
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - tests share service instance and need isolation
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AppState } from 'react-native';

import type { EnhancedAudioTrack } from '@/types/audio.types';

// Mock dependencies BEFORE importing service
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  setIsAudioActiveAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock AppState addEventListener - must be defined before mock
const mockAppStateAddEventListener = jest.fn(() => ({
  remove: jest.fn(),
}));

jest.mock(
  'react-native',
  () => {
    return {
      AppState: {
        addEventListener: mockAppStateAddEventListener,
      },
    };
  },
  { virtual: true },
);

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/utils/transitionSound', () => ({
  playTransitionSound: jest.fn().mockResolvedValue(undefined),
}));

// Import mocked modules
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { handleError } from '@/utils/errorHandling';
import { playTransitionSound } from '@/utils/transitionSound';

// Type-safe mocks
const mockCreateAudioPlayer = jest.mocked(createAudioPlayer);
const mockSetAudioModeAsync = jest.mocked(setAudioModeAsync);
const mockSetIsAudioActiveAsync = jest.mocked(setIsAudioActiveAsync);
const mockHandleError = jest.mocked(handleError);
const mockPlayTransitionSound = jest.mocked(playTransitionSound);

// Import service AFTER mocks
import type { AudioStatus } from '@/services/audioPlayer';

describe('audioPlayer service', () => {
  let SimpleAudioService: typeof import('@/services/audioPlayer').simpleAudioService.constructor;
  let audioService: InstanceType<typeof SimpleAudioService>;

  // Mock audio player instance
  let mockPlayer: {
    play: jest.Mock;
    pause: jest.Mock;
    remove: jest.Mock;
    seekTo: jest.Mock;
    addListener: jest.Mock;
  };

  // Test tracks
  const testTrack: EnhancedAudioTrack = {
    id: 'article-1',
    articleId: 1,
    audioUrl: 'https://example.com/audio1.mp3',
    title: 'Test Article 1',
    imageUrl: 'https://example.com/image1.jpg',
    duration: 120,
  };

  const testTrack2: EnhancedAudioTrack = {
    id: 'article-2',
    articleId: 2,
    audioUrl: 'https://example.com/audio2.mp3',
    title: 'Test Article 2',
    duration: 90,
  };

  const testTrack3: EnhancedAudioTrack = {
    id: 'article-3',
    articleId: 3,
    audioUrl: 'https://example.com/audio3.mp3',
    title: 'Test Article 3',
    duration: 150,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock player for each test
    // CRITICAL: Default mock must fire ready status to prevent waitForPlayerReady from hanging
    let statusCallback: ((status: { isLoaded?: boolean; playbackState?: string }) => void) | null =
      null;
    mockPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn((event, callback) => {
        if (event === 'playbackStatusUpdate') {
          statusCallback = callback;
          // Automatically fire ready status to prevent tests from hanging
          // Tests that need specific behavior can override this
          process.nextTick(() => {
            if (statusCallback) {
              statusCallback({ isLoaded: true, playbackState: 'ready' });
            }
          });
        }
        return { remove: jest.fn() };
      }),
    };

    mockCreateAudioPlayer.mockReturnValue(mockPlayer);

    // Create fresh service instance for each test
    // Import service module to get class
    const audioPlayerModule = require('@/services/audioPlayer');
    SimpleAudioService = audioPlayerModule.simpleAudioService.constructor;
    audioService = new SimpleAudioService();
  });

  afterEach(async () => {
    // Cleanup service
    try {
      await audioService.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should initialize with idle state', () => {
      const status = audioService.getStatus();

      expect(status.isPlaying).toBe(false);
      expect(status.isLoading).toBe(false);
      expect(status.currentTime).toBe(0);
      expect(status.duration).toBe(0);
      expect(status.currentTrack).toBeNull();
      expect(status.playbackState).toBe('idle');
    });

    test('should initialize playlist mode as false', () => {
      const playlistInfo = audioService.getPlaylistInfo();

      expect(playlistInfo.isPlaylistMode).toBe(false);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(0);
    });

    test('should initialize with no listeners', () => {
      const status = audioService.getStatus();
      expect(status).toBeDefined();
      // If there were listeners, status updates would trigger them
    });
  });

  describe('Single Track Playback', () => {
    test('should play audio track successfully', async () => {
      const success = await audioService.play(testTrack);

      expect(success).toBe(true);
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
        testTrack.audioUrl,
        expect.objectContaining({ updateInterval: 500 }),
      );
      expect(mockPlayer.play).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(true);
      expect(status.currentTrack).toEqual(testTrack);
    });

    test('should configure audio session on first play', async () => {
      await audioService.play(testTrack);

      expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
      expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldPlayInBackground: true,
          playsInSilentMode: true,
        }),
      );
    });

    it('should set loading state when playing new track', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        if (status.isLoading) {
          loadingStateSeen = true;
        }
      });

      await audioService.play(testTrack);

      expect(loadingStateSeen).toBe(true);
    });

    it('should skip loading state when skipLoadingState option is true', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        if (status.isLoading) {
          loadingStateSeen = true;
        }
      });

      await audioService.play(testTrack, { skipLoadingState: true });

      expect(loadingStateSeen).toBe(false);
    });

    test('should clean up previous player when switching tracks', async () => {
      await audioService.play(testTrack);
      const firstPlayer = mockPlayer;

      // Create new mock player for second track
      // CRITICAL: Must fire ready status to prevent waitForPlayerReady from hanging
      let statusCallback:
        | ((status: { isLoaded?: boolean; playbackState?: string }) => void)
        | null = null;
      const secondPlayer = {
        play: jest.fn(),
        pause: jest.fn(),
        remove: jest.fn(),
        seekTo: jest.fn(),
        addListener: jest.fn((event, callback) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = callback;
            // Automatically fire ready status
            process.nextTick(() => {
              if (statusCallback) {
                statusCallback({ isLoaded: true, playbackState: 'ready' });
              }
            });
          }
          return { remove: jest.fn() };
        }),
      };
      mockCreateAudioPlayer.mockReturnValueOnce(secondPlayer);

      await audioService.play(testTrack2);

      expect(firstPlayer.pause).toHaveBeenCalled();
      expect(firstPlayer.remove).toHaveBeenCalled();
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith(testTrack2.audioUrl, expect.any(Object));
    });

    test('should handle play errors gracefully', async () => {
      // Make both attempts fail (initial + retry)
      mockCreateAudioPlayer
        .mockImplementationOnce(() => {
          throw new Error('Audio creation failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('Audio creation failed again');
        });

      const success = await audioService.play(testTrack);

      expect(success).toBe(false);
      expect(mockHandleError).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
    });

    test('should wait for player readiness before playing', async () => {
      // Mock player with listener that simulates readiness
      let statusCallback:
        | ((status: { isLoaded?: boolean; playbackState?: string }) => void)
        | null = null;
      const mockRemoveListener = jest.fn();
      const mockPlayerWithListener = {
        ...mockPlayer,
        addListener: jest.fn((event, callback) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = callback;
          }
          return { remove: mockRemoveListener };
        }),
      };
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayerWithListener);

      // Start play (should wait for readiness)
      const playPromise = audioService.play(testTrack);

      // Give it a moment to set up the listener
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify play() hasn't been called yet (waiting for readiness)
      expect(mockPlayerWithListener.play).not.toHaveBeenCalled();

      // Simulate player becoming ready
      if (statusCallback) {
        statusCallback({ isLoaded: true, playbackState: 'ready' });
      }

      // Wait for play to complete
      await playPromise;

      // Now play() should have been called
      expect(mockPlayerWithListener.play).toHaveBeenCalled();
      expect(mockRemoveListener).toHaveBeenCalled(); // Listener should be cleaned up
    });

    test('should resolve immediately if player is ready with playbackState', async () => {
      let statusCallback:
        | ((status: { isLoaded?: boolean; playbackState?: string }) => void)
        | null = null;
      const mockPlayerWithListener = {
        ...mockPlayer,
        addListener: jest.fn((event, callback) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = callback;
            // Immediately fire ready state
            process.nextTick(() => {
              if (statusCallback) {
                statusCallback({ playbackState: 'ready' });
              }
            });
          }
          return { remove: jest.fn() };
        }),
      };
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayerWithListener);

      const success = await audioService.play(testTrack);

      expect(success).toBe(true);
      expect(mockPlayerWithListener.play).toHaveBeenCalled();
    });

    test('should resolve immediately if player is ready with isLoaded', async () => {
      let statusCallback:
        | ((status: { isLoaded?: boolean; playbackState?: string }) => void)
        | null = null;
      const mockPlayerWithListener = {
        ...mockPlayer,
        addListener: jest.fn((event, callback) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = callback;
            // Immediately fire ready state
            process.nextTick(() => {
              if (statusCallback) {
                statusCallback({ isLoaded: true });
              }
            });
          }
          return { remove: jest.fn() };
        }),
      };
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayerWithListener);

      const success = await audioService.play(testTrack);

      expect(success).toBe(true);
      expect(mockPlayerWithListener.play).toHaveBeenCalled();
    });

    test('should attempt audio session reset on first play failure', async () => {
      // First attempt fails
      mockCreateAudioPlayer.mockImplementationOnce(() => {
        throw new Error('Audio creation failed');
      });

      // Second attempt (after reset) succeeds
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayer);

      const success = await audioService.play(testTrack);

      // Should have tried twice (initial + retry after reset)
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
      expect(success).toBe(true);
    });
  });

  describe('Stop Functionality', () => {
    test('should stop playback and reset state', async () => {
      await audioService.play(testTrack);
      await audioService.stop();

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.remove).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
      expect(status.currentTrack).toBeNull();
      expect(status.currentTime).toBe(0);
      expect(status.duration).toBe(0);
    });

    test('should reset playlist state when stopping', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);
      await audioService.stop();

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);
      expect(playlistInfo.totalTracks).toBe(0);
    });

    test('should handle stop errors and still reset state', async () => {
      await audioService.play(testTrack);
      mockPlayer.pause.mockImplementationOnce(() => {
        throw new Error('Pause failed');
      });

      // stopInternal() catches pause errors silently, so stop() succeeds
      await audioService.stop();

      // State should be reset even if pause failed
      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
      expect(status.currentTrack).toBeNull();
    });
  });

  describe('Seek Functionality', () => {
    test('should seek to position', async () => {
      await audioService.play(testTrack);
      await audioService.seekTo(30);

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(30);

      const status = audioService.getStatus();
      expect(status.currentTime).toBe(30);
    });

    test('should handle seek errors', async () => {
      await audioService.play(testTrack);
      mockPlayer.seekTo.mockRejectedValueOnce(new Error('Seek failed'));

      await expect(audioService.seekTo(30)).rejects.toThrow('Failed to seek audio playback');
    });

    test('should not seek if no player exists', async () => {
      await audioService.seekTo(30);

      expect(mockPlayer.seekTo).not.toHaveBeenCalled();
    });
  });

  describe('Playlist Mode', () => {
    it('should start playlist with first track', async () => {
      const success = await audioService.playPlaylist([testTrack, testTrack2, testTrack3]);

      expect(success).toBe(true);

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(true);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(3);

      const status = audioService.getStatus();
      expect(status.currentTrack).toEqual(testTrack);
    });

    it('should skip loading state for playlist start', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        if (status.isLoading) {
          loadingStateSeen = true;
        }
      });

      await audioService.playPlaylist([testTrack, testTrack2]);

      expect(loadingStateSeen).toBe(false);
    });

    it('should return false for empty playlist', async () => {
      const success = await audioService.playPlaylist([]);

      expect(success).toBe(false);

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);
    });

    it('should call onTrackComplete callback when advancing tracks', async () => {
      const onTrackComplete = jest.fn();

      await audioService.playPlaylist([testTrack, testTrack2], onTrackComplete);

      // Simulate track completion by triggering didJustFinish event
      const addListenerCall = mockPlayer.addListener.mock.calls[0];
      expect(addListenerCall[0]).toBe('playbackStatusUpdate');

      const eventHandler = addListenerCall[1];

      // Trigger track finish
      eventHandler({ didJustFinish: true });

      // Wait for async advancement
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onTrackComplete).toHaveBeenCalledWith(testTrack2);
    });

    it('should play transition sound between tracks', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPlayTransitionSound).toHaveBeenCalled();
    });

    it('should not play transition sound for single-track playlist', async () => {
      await audioService.playPlaylist([testTrack]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should stop instead of advancing (and not play transition)
      expect(mockPlayTransitionSound).not.toHaveBeenCalled();
    });

    it('should stop playlist when all tracks complete', async () => {
      await audioService.playPlaylist([testTrack]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
    });

    it('should prevent duplicate track advancement from race conditions', async () => {
      await audioService.playPlaylist([testTrack, testTrack2, testTrack3]);

      const eventHandler = mockPlayer.addListener.mock.calls[0][1];

      // Trigger multiple didJustFinish events rapidly
      eventHandler({ didJustFinish: true });
      eventHandler({ didJustFinish: true });
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have advanced once, not three times
      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.currentIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('Sleep Timer Integration', () => {
    test('should track sleep timer expired state', () => {
      expect(audioService.isSleepTimerExpired()).toBe(false);

      audioService.markSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBe(true);

      audioService.resetSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBe(false);
    });

    it('should stop playlist when sleep timer expires', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);

      audioService.markSleepTimerExpired();

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should stop instead of advancing to next track
      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
    });

    it('should reset sleep timer when starting new playlist', async () => {
      audioService.markSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBe(true);

      await audioService.playPlaylist([testTrack, testTrack2]);

      expect(audioService.isSleepTimerExpired()).toBe(false);
    });
  });

  describe('Status Updates and Subscriptions', () => {
    it('should notify subscribers of status changes', async () => {
      const listener = jest.fn();
      const unsubscribe = audioService.subscribe(listener);

      await audioService.play(testTrack);

      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
      expect(lastCall.isPlaying).toBe(true);
      expect(lastCall.currentTrack).toEqual(testTrack);

      unsubscribe();
    });

    it('should allow multiple subscribers', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      audioService.subscribe(listener1);
      audioService.subscribe(listener2);

      await audioService.play(testTrack);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', async () => {
      const listener = jest.fn();
      const unsubscribe = audioService.subscribe(listener);

      await audioService.play(testTrack);
      const callCountBefore = listener.mock.calls.length;

      unsubscribe();

      await audioService.stop();
      const callCountAfter = listener.mock.calls.length;

      // Should not receive stop event
      expect(callCountAfter).toBe(callCountBefore);
    });

    it('should handle listener errors gracefully', async () => {
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      audioService.subscribe(badListener);
      audioService.subscribe(goodListener);

      await audioService.play(testTrack);

      // Good listener should still be called despite bad listener error
      expect(goodListener).toHaveBeenCalled();
    });

    it('should update status from native playback events', async () => {
      await audioService.play(testTrack);

      const eventHandler = mockPlayer.addListener.mock.calls[0][1];

      // Simulate native status update
      eventHandler({
        playing: true,
        currentTime: 10,
        duration: 120,
        isLoaded: true,
        isBuffering: false,
        playbackState: 'ready',
        timeControlStatus: 'playing',
      });

      const status = audioService.getStatus();
      expect(status.currentTime).toBe(10);
      expect(status.duration).toBe(120);
      expect(status.isLoaded).toBe(true);
      expect(status.playbackState).toBe('ready');
    });

    it('should handle invalid time values in native events', async () => {
      await audioService.play(testTrack);

      const eventHandler = mockPlayer.addListener.mock.calls[0][1];

      // Simulate invalid values
      eventHandler({
        currentTime: NaN,
        duration: Infinity,
      });

      const status = audioService.getStatus();
      expect(status.currentTime).toBe(0);
      expect(status.duration).toBe(0);
    });

    it('should detect track completion from didJustFinish', async () => {
      await audioService.play(testTrack);

      const eventHandler = mockPlayer.addListener.mock.calls[0][1];

      eventHandler({
        didJustFinish: true,
        duration: 120,
      });

      const status = audioService.getStatus();
      expect(status.isPlaying).toBe(false);
      expect(status.didJustFinish).toBe(true);
      expect(status.currentTime).toBe(120);
    });
  });

  describe('Background Audio Handling', () => {
    // Skipped: Test isolation issue - AppState mock conflicts with other test files
    test.skip('should setup AppState listener on audio session configuration', async () => {
      await audioService.play(testTrack);

      expect(mockAppStateAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    // Skipped: Test isolation issue - AppState mock conflicts with other test files
    test.skip('should maintain audio session when app goes to background', async () => {
      await audioService.play(testTrack);

      const appStateListener = mockAppStateAddEventListener.mock.calls[0][1];

      await appStateListener('background');

      expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
      expect(mockSetAudioModeAsync).toHaveBeenCalled();
    });

    // Skipped: Test isolation issue - AppState mock conflicts with other test files
    test.skip('should maintain audio session when app returns to foreground', async () => {
      await audioService.play(testTrack);

      const appStateListener = mockAppStateAddEventListener.mock.calls[0][1];

      await appStateListener('active');

      expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
    });
  });

  describe('Memory Cleanup', () => {
    test('should cleanup resources on destroy', async () => {
      await audioService.play(testTrack);

      await audioService.destroy();

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(false);

      // destroy() cleans up resources but doesn't reset status (by design)
      // Future play() calls would fail since player is destroyed
    });

    test('should remove all listeners on destroy', async () => {
      const listener = jest.fn();
      audioService.subscribe(listener);

      await audioService.destroy();
      await audioService.play(testTrack);

      // Listener should not receive events after destroy
      expect(listener).not.toHaveBeenCalled();
    });

    // Skipped: Test isolation issue - AppState mock conflicts with other test files
    test.skip('should remove AppState listener on destroy', async () => {
      const mockRemove = jest.fn();
      mockAppStateAddEventListener.mockReturnValueOnce({
        remove: mockRemove,
      });

      await audioService.play(testTrack);
      await audioService.destroy();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle preconfigureAudioSession before first play', async () => {
      await audioService.preconfigureAudioSession();

      expect(mockSetAudioModeAsync).toHaveBeenCalled();

      // Should not reconfigure on play
      mockSetAudioModeAsync.mockClear();
      await audioService.play(testTrack);

      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
    });

    test('should throttle audio session activation calls', async () => {
      await audioService.play(testTrack);

      const firstCallCount = mockSetIsAudioActiveAsync.mock.calls.length;

      // Immediately play another track (within 5s throttle window)
      await audioService.play(testTrack2);

      const secondCallCount = mockSetIsAudioActiveAsync.mock.calls.length;

      // Should not have made additional activation call due to throttling
      expect(secondCallCount).toBe(firstCallCount);
    });

    test('should handle stop when no player exists', async () => {
      await expect(audioService.stop()).resolves.not.toThrow();
    });

    test('should handle playlist error and return false', async () => {
      // Make both attempts fail (initial + retry)
      mockCreateAudioPlayer
        .mockImplementationOnce(() => {
          throw new Error('Player creation failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('Player creation failed again');
        });

      // playPlaylist returns false when play() fails
      const success = await audioService.playPlaylist([testTrack, testTrack2]);
      expect(success).toBe(false);

      // Note: Playlist state is NOT reset when play() returns false (only when exception is thrown)
      // This is the actual behavior - playlist state remains until stop() is called
    });
  });
});
