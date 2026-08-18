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
// resetMocks: true (jest.config.js) wipes implementations set at module-factory
// time, so a jest.fn(async (..._args: unknown[]) => ...) member returns undefined during
// tests. That is fine for awaited members (await undefined resolves) but any
// member the service uses via promise chaining (`.catch()`) would throw a
// synchronous TypeError mid-test. Fire-and-forget members with no assertion
// handle are therefore plain functions; members asserted on in tests stay
// jest.fn (call tracking survives resets, and their resolved values are only
// ever awaited).
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(async (..._args: unknown[]) => undefined),
  setIsAudioActiveAsync: jest.fn(async (..._args: unknown[]) => undefined),
  preload: () => Promise.resolve(undefined),
  clearPreloadedSource: () => Promise.resolve(undefined),
  clearAllPreloadedSources: () => Promise.resolve(undefined),
}));

// Mock AppState addEventListener - must be defined before mock
const mockAppStateAddEventListener = jest.fn((..._args: unknown[]) => ({
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
  // Mirrors the real toError: audioPlayer routes caught unknowns through it so
  // thrown non-Errors can't render as "[object Object]" in the message.
  toError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
}));

jest.mock('@/utils/transitionSound', () => ({
  playTransitionSound: jest.fn(async (..._args: unknown[]) => undefined),
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
import { articleId } from '@/__tests__/helpers/ids';
import type { AudioPlayer } from 'expo-audio';

describe('audioPlayer service', () => {
  // The class itself is not exported — only the singleton — so the constructor is
  // reached through it. `.constructor` is typed `Function`, which is not
  // constructable and left `audioService` (and every status callback below)
  // implicitly `any`.
  type SimpleAudioServiceCtor =
    new () => typeof import('@/services/audioPlayer').simpleAudioService;

  let SimpleAudioService: SimpleAudioServiceCtor;
  let audioService: InstanceType<SimpleAudioServiceCtor>;

  // Mock audio player instance. The signatures are spelled out because a bare
  // `jest.Mock` is `Mock<UnknownFunction>`: the `addListener` callback then
  // arrives as `unknown`, so every status this suite feeds through it was
  // unchecked.
  // The native listener receives partial status updates, so any subset of the
  // service's own AudioStatus is valid.
  type PlayerStatus = Partial<AudioStatus>;
  type StatusListener = (status: PlayerStatus) => void;

  let mockPlayer: {
    play: jest.Mock<() => void>;
    pause: jest.Mock<() => void>;
    remove: jest.Mock<() => void>;
    replace: jest.Mock<(source: unknown) => void>;
    seekTo: jest.Mock<(seconds: number) => Promise<void>>;
    addListener: jest.Mock<(event: string, callback: StatusListener) => { remove: () => void }>;
    setActiveForLockScreen: jest.Mock<(active: boolean) => void>;
    clearLockScreenControls: jest.Mock<() => void>;
  };

  // Test tracks
  const testTrack: EnhancedAudioTrack = {
    id: 'article-1',
    articleId: articleId(1),
    audioUrl: 'https://example.com/audio1.mp3',
    title: 'Test Article 1',
    imageUrl: 'https://example.com/image1.jpg',
  };

  const testTrack2: EnhancedAudioTrack = {
    id: 'article-2',
    articleId: articleId(2),
    audioUrl: 'https://example.com/audio2.mp3',
    title: 'Test Article 2',
  };

  const testTrack3: EnhancedAudioTrack = {
    id: 'article-3',
    articleId: articleId(3),
    audioUrl: 'https://example.com/audio3.mp3',
    title: 'Test Article 3',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock player for each test
    // CRITICAL: Default mock must fire ready status to prevent waitForPlayerReady from hanging
    let statusCallback: StatusListener | null = null;
    mockPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      replace: jest.fn(),
      seekTo: jest.fn(async (..._args: unknown[]) => undefined),
      setActiveForLockScreen: jest.fn(),
      clearLockScreenControls: jest.fn(),
      addListener: jest.fn((event: string, callback: StatusListener) => {
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

    mockCreateAudioPlayer.mockReturnValue(mockPlayer as unknown as AudioPlayer);

    // Create fresh service instance for each test
    // Import service module to get class
    const audioPlayerModule = require('@/services/audioPlayer');
    SimpleAudioService = audioPlayerModule.simpleAudioService.constructor as SimpleAudioServiceCtor;
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

      expect(status.playing).toBeFalsy();
      expect(status.isLoaded).toBeFalsy();
      expect(status.isBuffering).toBeFalsy();
      expect(status.currentTime).toBe(0);
      expect(status.duration).toBe(0);
      expect(status.currentTrack).toBeNull();
      expect(status.playbackState).toBe('idle');
    });

    test('should initialize playlist mode as false', () => {
      const playlistInfo = audioService.getPlaylistInfo();

      expect(playlistInfo.isPlaylistMode).toBeFalsy();
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

      expect(success).toBeTruthy();
      expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
        testTrack.audioUrl,
        expect.objectContaining({ updateInterval: 500 }),
      );
      expect(mockPlayer.play).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.playing).toBeTruthy();
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

    test('should set loading state when playing new track', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        // The "loading state" the service emits explicitly sets isBuffering: true.
        // Plain "not yet loaded" (initial isLoaded: false) is not what we check for.
        if (status.isBuffering) {
          loadingStateSeen = true;
        }
      });

      await audioService.play(testTrack);

      expect(loadingStateSeen).toBeTruthy();
    });

    test('should skip loading state when skipLoadingState option is true', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        // The "loading state" the service emits explicitly sets isBuffering: true.
        // Plain "not yet loaded" (initial isLoaded: false) is not what we check for.
        if (status.isBuffering) {
          loadingStateSeen = true;
        }
      });

      await audioService.play(testTrack, { skipLoadingState: true });

      expect(loadingStateSeen).toBeFalsy();
    });

    test('should dispose old player and create a fresh one when switching tracks', async () => {
      await audioService.play(testTrack);

      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);

      await audioService.play(testTrack2);

      // Fresh player per track — the previous one is paused + removed, and a
      // new one is created. This eliminates the post-replace() isLoaded race
      // where subsequent tracks silently no-op.
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
      expect(mockCreateAudioPlayer).toHaveBeenLastCalledWith(
        testTrack2.audioUrl,
        expect.objectContaining({ updateInterval: 500 }),
      );
      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.remove).toHaveBeenCalled();
      expect(mockPlayer.replace).not.toHaveBeenCalled();
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

      expect(success).toBeFalsy();
      expect(mockHandleError).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.playing).toBeFalsy();
    });

    test('should recover from a synchronous play() throw via session reset with a fresh player', async () => {
      // Player whose play() always throws synchronously (e.g. session conflict)
      const mockThrowingPlayer = {
        ...mockPlayer,
        play: jest.fn((..._args: unknown[]) => {
          throw new Error('Player not ready');
        }),
      };
      mockCreateAudioPlayer.mockReturnValueOnce(mockThrowingPlayer as unknown as AudioPlayer);

      const success = await audioService.play(testTrack);

      // The failed player is never blindly re-invoked (that retry could not
      // succeed — the source was already loaded — and could double-invoke a
      // removed player). Recovery is the outer catch: session reset plus one
      // retry with a FRESH player.
      expect(success).toBeTruthy();
      expect(mockThrowingPlayer.play).toHaveBeenCalledTimes(1);
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
      expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    });

    test('should resolve immediately if player is ready with playbackState', async () => {
      let statusCallback: StatusListener | null = null;
      const mockPlayerWithListener = {
        ...mockPlayer,
        addListener: jest.fn((event: string, callback: StatusListener) => {
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
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayerWithListener as unknown as AudioPlayer);

      const success = await audioService.play(testTrack);

      expect(success).toBeTruthy();
      expect(mockPlayerWithListener.play).toHaveBeenCalled();
    });

    test('should resolve immediately if player is ready with isLoaded', async () => {
      let statusCallback: StatusListener | null = null;
      const mockPlayerWithListener = {
        ...mockPlayer,
        addListener: jest.fn((event: string, callback: StatusListener) => {
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
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayerWithListener as unknown as AudioPlayer);

      const success = await audioService.play(testTrack);

      expect(success).toBeTruthy();
      expect(mockPlayerWithListener.play).toHaveBeenCalled();
    });

    test('should attempt audio session reset on first play failure', async () => {
      // First attempt fails
      mockCreateAudioPlayer.mockImplementationOnce(() => {
        throw new Error('Audio creation failed');
      });

      // Second attempt (after reset) succeeds
      mockCreateAudioPlayer.mockReturnValueOnce(mockPlayer as unknown as AudioPlayer);

      const success = await audioService.play(testTrack);

      // Should have tried twice (initial + retry after reset)
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
      expect(success).toBeTruthy();
    });
  });

  describe('Stop Functionality', () => {
    test('should stop playback and dispose player', async () => {
      await audioService.play(testTrack);
      await audioService.stop();

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.remove).toHaveBeenCalled();

      const status = audioService.getStatus();
      expect(status.playing).toBeFalsy();
      expect(status.currentTrack).toBeNull();
      expect(status.currentTime).toBe(0);
      expect(status.duration).toBe(0);
    });

    test('should reset playlist state when stopping', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);
      await audioService.stop();

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBeFalsy();
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
      expect(status.playing).toBeFalsy();
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
    test('should start playlist with first track', async () => {
      const success = await audioService.playPlaylist([testTrack, testTrack2, testTrack3]);

      expect(success).toBeTruthy();

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBeTruthy();
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(3);

      const status = audioService.getStatus();
      expect(status.currentTrack).toEqual(testTrack);
    });

    test('should skip loading state for a cached playlist start', async () => {
      let loadingStateSeen = false;
      audioService.subscribe(status => {
        // The "loading state" the service emits explicitly sets isBuffering: true.
        // Plain "not yet loaded" (initial isLoaded: false) is not what we check for.
        if (status.isBuffering) {
          loadingStateSeen = true;
        }
      });

      // A local file loads instantly — the intermediate state would only flash.
      const cachedTrack = { ...testTrack, audioUrl: 'file:///cache/audio1.mp3' };
      await audioService.playPlaylist([cachedTrack, testTrack2]);

      expect(loadingStateSeen).toBeFalsy();
    });

    test('should publish loading state for a streamed playlist start', async () => {
      let loadingStateSeen = false;
      let trackSeenWhileLoading: string | null = null;
      audioService.subscribe(status => {
        if (status.isBuffering) {
          loadingStateSeen = true;
          trackSeenWhileLoading = status.currentTrack?.id ?? null;
        }
      });

      // A remote source has to buffer. Suppressing the loading state here left
      // the MiniPlayer hidden and the Listen button inert for the whole buffer.
      await audioService.playPlaylist([testTrack, testTrack2]);

      expect(loadingStateSeen).toBeTruthy();
      // The track is published too, so the MiniPlayer can render immediately
      // with its title and artwork instead of waiting for playback.
      expect(trackSeenWhileLoading).toBe(testTrack.id);
    });

    test('should return false for empty playlist', async () => {
      const success = await audioService.playPlaylist([]);

      expect(success).toBeFalsy();

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBeFalsy();
    });

    test('should call onTrackComplete callback when advancing tracks', async () => {
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

    test('should play transition sound between tracks', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPlayTransitionSound).toHaveBeenCalled();
    });

    test('should not play transition sound for single-track playlist', async () => {
      await audioService.playPlaylist([testTrack]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should stop instead of advancing (and not play transition)
      expect(mockPlayTransitionSound).not.toHaveBeenCalled();
    });

    test('should stop playlist when all tracks complete', async () => {
      await audioService.playPlaylist([testTrack]);

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBeFalsy();

      const status = audioService.getStatus();
      expect(status.playing).toBeFalsy();
    });

    test('should prevent duplicate track advancement from race conditions', async () => {
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
      expect(audioService.isSleepTimerExpired()).toBeFalsy();

      audioService.markSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBeTruthy();

      audioService.resetSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBeFalsy();
    });

    test('should stop playlist when sleep timer expires', async () => {
      await audioService.playPlaylist([testTrack, testTrack2]);

      audioService.markSleepTimerExpired();

      // Trigger track completion
      const eventHandler = mockPlayer.addListener.mock.calls[0][1];
      eventHandler({ didJustFinish: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should stop instead of advancing to next track
      const playlistInfo = audioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBeFalsy();

      const status = audioService.getStatus();
      expect(status.playing).toBeFalsy();
    });

    test('should reset sleep timer when starting new playlist', async () => {
      audioService.markSleepTimerExpired();
      expect(audioService.isSleepTimerExpired()).toBeTruthy();

      await audioService.playPlaylist([testTrack, testTrack2]);

      expect(audioService.isSleepTimerExpired()).toBeFalsy();
    });
  });

  describe('Status Updates and Subscriptions', () => {
    test('should notify subscribers of status changes', async () => {
      const listener = jest.fn<(status: AudioStatus) => void>();
      const unsubscribe = audioService.subscribe(listener);

      await audioService.play(testTrack);

      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
      expect(lastCall.playing).toBeTruthy();
      expect(lastCall.currentTrack).toEqual(testTrack);

      unsubscribe();
    });

    test('should allow multiple subscribers', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      audioService.subscribe(listener1);
      audioService.subscribe(listener2);

      await audioService.play(testTrack);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('should unsubscribe correctly', async () => {
      const listener = jest.fn<(status: AudioStatus) => void>();
      const unsubscribe = audioService.subscribe(listener);

      await audioService.play(testTrack);
      const callCountBefore = listener.mock.calls.length;

      unsubscribe();

      await audioService.stop();
      const callCountAfter = listener.mock.calls.length;

      // Should not receive stop event
      expect(callCountAfter).toBe(callCountBefore);
    });

    test('should handle listener errors gracefully', async () => {
      const badListener = jest.fn((..._args: unknown[]) => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      audioService.subscribe(badListener);
      audioService.subscribe(goodListener);

      await audioService.play(testTrack);

      // Good listener should still be called despite bad listener error
      expect(goodListener).toHaveBeenCalled();
    });

    test('should update status from native playback events', async () => {
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
      expect(status.isLoaded).toBeTruthy();
      expect(status.playbackState).toBe('ready');
    });

    test('should handle invalid time values in native events', async () => {
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

    test('should detect track completion from didJustFinish', async () => {
      await audioService.play(testTrack);

      const eventHandler = mockPlayer.addListener.mock.calls[0][1];

      eventHandler({
        didJustFinish: true,
        duration: 120,
      });

      const status = audioService.getStatus();
      expect(status.playing).toBeFalsy();
      expect(status.didJustFinish).toBeTruthy();
      expect(status.currentTime).toBe(120);
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
      const listener = jest.fn<(status: AudioStatus) => void>();
      audioService.subscribe(listener);

      await audioService.destroy();
      await audioService.play(testTrack);

      // Listener should not receive events after destroy
      expect(listener).not.toHaveBeenCalled();
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

    // A review session claims the record-capable category once and holds it for
    // its whole life (VoiceGradingProvider.acquireSession), so that no card pays
    // for a category change between its prompt ending and its microphone
    // opening. play() used to take that category back on every call, which
    // meant every prompt and every revealed answer silently undid the session.
    //
    // What the release was protecting against — the app recording its own
    // playback — is handled a level up: the capture window is closed while the
    // prompt plays and buffers outside a window are discarded.
    test('does not release the recording session when playback starts', async () => {
      await audioService.setRecordingSessionEnabled(true);
      mockSetAudioModeAsync.mockClear();
      mockCreateAudioPlayer.mockClear();

      await audioService.play(testTrack);

      const releasedRecording = mockSetAudioModeAsync.mock.calls.some(
        call => (call[0] as { allowsRecording?: boolean } | undefined)?.allowsRecording === false,
      );
      expect(releasedRecording).toBe(false);
      expect(mockCreateAudioPlayer).toHaveBeenCalled();
    });

    // react-native-audio-api configures the SAME AVAudioSession directly, so
    // this flag can describe a session that no longer exists: a foreground /
    // interruption reopen puts it back on .playAndRecord (and, with iOS raw mode
    // on, mode .measurement) without coming through here. Every guard that
    // restores playback shape is an equality check on the flag, so a stale one
    // silently disables all of them — which is how a backgrounded review came
    // back with prompts nobody could hear. A teardown must be able to insist.
    test('re-applies the playback mode when forced, even if the flag agrees', async () => {
      await audioService.setRecordingSessionEnabled(false);
      mockSetAudioModeAsync.mockClear();

      await audioService.setRecordingSessionEnabled(false);
      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();

      await audioService.setRecordingSessionEnabled(false, { force: true });
      expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ allowsRecording: false }),
      );
    });

    test('leaves the audio mode alone when no recording session is held', async () => {
      await audioService.preconfigureAudioSession();
      mockSetAudioModeAsync.mockClear();

      await audioService.play(testTrack);

      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
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
      expect(success).toBeFalsy();

      // Note: Playlist state is NOT reset when play() returns false (only when exception is thrown)
      // This is the actual behavior - playlist state remains until stop() is called
    });
  });
});
