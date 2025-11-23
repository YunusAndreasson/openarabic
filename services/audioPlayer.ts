import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
  type AudioPlayerOptions,
} from 'expo-audio';
import { AppState } from 'react-native';

import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';
import { playTransitionSound } from '@/utils/transitionSound';

// Event constant for playback status updates
const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

// Audio mode configuration for consistent behavior across iOS and Android
const AUDIO_MODE_CONFIG = {
  // Common
  shouldPlayInBackground: true,
  // iOS
  playsInSilentMode: true,
  allowsRecording: false,
  interruptionMode: 'duckOthers' as const,
  // Android
  interruptionModeAndroid: 'duckOthers' as const,
  shouldRouteThroughEarpiece: false,
};

// Reset audio status constant for consistent state clearing
const RESET_AUDIO_STATUS = {
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  isBuffering: false,
  playbackState: 'idle' as const,
  timeControlStatus: 'paused' as const,
  reasonForWaitingToPlay: '',
  didJustFinish: false,
};

/**
 * Simple audio service - single source of truth for native audio player
 */

class SimpleAudioService {
  private currentPlayer: AudioPlayer | null = null;
  private currentTrack: EnhancedAudioTrack | null = null;
  private listeners: Set<(status: AudioStatus) => void> = new Set();
  private eventSubscription: { remove: () => void } | null = null;
  private audioSessionConfigured = false;

  // Time-based activation throttling to avoid redundant iOS audio session calls
  private lastActivationTime = 0;
  private readonly ACTIVATION_THROTTLE = 5000; // 5 seconds

  // PLAYLIST SUPPORT: Add playlist state management
  private playlist: EnhancedAudioTrack[] = [];
  private currentPlaylistIndex = 0;
  private isPlaylistMode = false;
  private onPlaylistTrackComplete: ((nextTrack: EnhancedAudioTrack | null) => void) | null = null;
  private initialPlaylistLength = 0; // Track initial playlist size for transition sound logic

  // SLEEP TIMER SUPPORT: Track when sleep timer has expired
  private sleepTimerExpired = false;

  // RACE CONDITION GUARD: Prevent duplicate track advancement from rapid-fire events
  private isAdvancingTrack = false;

  // APP STATE SUPPORT: Track app state for background audio handling
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  // Current audio status
  private status: AudioStatus = {
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
    // Native states
    isLoaded: false,
    isBuffering: false,
    playbackState: 'idle',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: '',
    didJustFinish: false,
  };

  /**
   * Reset all status fields to default values
   */
  private resetStatus(): void {
    this.updateStatus({
      ...RESET_AUDIO_STATUS,
      currentTrack: null,
    });
  }

  /**
   * Reset playlist state to default values
   */
  private resetPlaylistState(): void {
    this.isPlaylistMode = false;
    this.playlist = [];
    this.currentPlaylistIndex = 0;
    this.onPlaylistTrackComplete = null;
    this.initialPlaylistLength = 0;
    this.resetSleepTimerExpired();
  }

  /**
   * Safely activate audio session with proper error handling
   * Suppresses non-critical errors (e.g., background activation failures)
   * Only logs to Sentry for critical failures when app is active
   */
  private async safeActivateAudioSession(context: {
    location: string;
    isPlaying?: boolean;
    isPlaylistMode?: boolean;
  }): Promise<void> {
    const appState = AppState.currentState;
    // Default to 'active' if AppState.currentState is undefined (test environments)
    const isAppActive = appState === 'active' || appState === undefined;
    const isPlaying = context.isPlaying ?? this.status.isPlaying;
    const isPlaylistMode = context.isPlaylistMode ?? this.isPlaylistMode;
    const shouldBePlaying = isPlaying || isPlaylistMode;

    // Skip activation if app is in background and not actively playing
    // iOS may reject activation in these scenarios, which is expected behavior
    if (!isAppActive && !shouldBePlaying) {
      return; // Silently skip - not an error condition
    }

    try {
      await setIsAudioActiveAsync(true);
      this.lastActivationTime = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Only log to Sentry if app is active and we're trying to play audio
      // Background activation failures are expected iOS behavior and not errors
      const shouldLogToSentry = isAppActive && shouldBePlaying;

      if (shouldLogToSentry) {
        await handleError(error as Error, {
          showToast: false,
          sentryExtra: {
            operation: 'setIsAudioActiveAsync',
            location: context.location,
            appState,
            isPlaying,
            isPlaylistMode,
            shouldBePlaying,
            errorMessage,
          },
        });
      }
      // Continue execution - audio may still work in some scenarios
    }
  }

  /**
   * Configure audio session for proper playback
   */
  private async configureAudioSession(): Promise<void> {
    if (this.audioSessionConfigured) {
      return;
    }

    try {
      // Ensure audio is active at the OS level (only if app is active)
      await this.safeActivateAudioSession({
        location: 'configureAudioSession',
        isPlaying: false,
        isPlaylistMode: false,
      });

      await setAudioModeAsync(AUDIO_MODE_CONFIG);

      // Set up AppState listener for background audio handling
      this.setupAppStateListener();

      this.audioSessionConfigured = true;
    } catch (sessionError) {
      // This is critical - audio may not work properly
      throw new Error(`Audio session configuration failed: ${sessionError}`);
    }
  }

  /**
   * Pre-configure audio session for faster first playback
   */
  async preconfigureAudioSession(): Promise<void> {
    await this.configureAudioSession();
  }

  /**
   * Set up AppState listener for background audio handling
   */
  private setupAppStateListener(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async nextAppState => {
      try {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App is going to background - ensure audio session stays active
          // Only attempt if we're actively playing (iOS may reject otherwise)
          if (this.status.isPlaying || this.isPlaylistMode) {
            await this.safeActivateAudioSession({
              location: 'AppState.background',
              isPlaying: this.status.isPlaying,
              isPlaylistMode: this.isPlaylistMode,
            });
            // Re-configure audio session to maintain background playback
            try {
              await setAudioModeAsync(AUDIO_MODE_CONFIG);
            } catch {
              // Audio mode configuration may fail in background - not critical
            }
          }
        } else if (nextAppState === 'active') {
          // App is coming to foreground - ensure audio session is still active
          if (this.status.isPlaying || this.isPlaylistMode) {
            await this.safeActivateAudioSession({
              location: 'AppState.active',
              isPlaying: this.status.isPlaying,
              isPlaylistMode: this.isPlaylistMode,
            });
          }
        }
      } catch (error) {
        // Don't log AppState listener errors to Sentry - they're often expected
        // (e.g., iOS rejecting audio activation in certain system states)
        // Only log if it's a critical error that prevents playback
        const isPlaying = this.status.isPlaying || this.isPlaylistMode;
        if (isPlaying && nextAppState === 'active') {
          // Only log if we're trying to play and app became active
          await handleError(error as Error, {
            showToast: false,
            sentryExtra: {
              operation: 'AppState.addEventListener',
              appState: nextAppState,
              isPlaying,
              isPlaylistMode: this.isPlaylistMode,
            },
          });
        }
        // Don't throw errors from AppState listener as it can cause crashes
      }
    });
  }

  /**
   * Reset audio session for recovery from corruption
   */
  async resetAudioSession(): Promise<void> {
    try {
      // Stop current playback
      await this.stopInternal();

      // Reset audio session configuration
      this.audioSessionConfigured = false;

      // Reconfigure audio session
      await this.configureAudioSession();

      // Reset status
      this.resetStatus();
    } catch (error) {
      // Even if reset fails, clear the configuration flag to force reconfiguration
      this.audioSessionConfigured = false;
      throw new Error(`Audio session reset failed: ${error}`);
    }
  }

  /**
   * Wait for player to be ready before playing
   * Uses native playbackStatusUpdate events to detect when player is initialized
   */
  private async waitForPlayerReady(): Promise<void> {
    const player = this.currentPlayer;
    if (!player) {
      return;
    }

    return new Promise<void>(resolve => {
      // Listen for first status update indicating player is ready
      const readySubscription = player.addListener(
        PLAYBACK_STATUS_UPDATE,
        (status: { isLoaded?: boolean; playbackState?: string }) => {
          // Player is ready when isLoaded is true or playbackState is 'ready'
          const isReady = status.isLoaded === true || status.playbackState === 'ready';

          if (isReady) {
            readySubscription.remove();
            resolve();
          }
        },
      );
    });
  }

  /**
   * Create fresh audio player for a track
   * No caching - audio files are already cached locally by audioCache service
   */
  private async createFreshPlayer(audioUrl: string): Promise<AudioPlayer> {
    // Properly clean up previous player to prevent memory leaks
    if (this.currentPlayer) {
      const oldPlayer = this.currentPlayer;

      // Clear event subscription from previous player
      this.stopEventSubscription();

      // Null references immediately
      this.currentPlayer = null;
      this.currentTrack = null;

      // Properly dispose of old player to free memory
      try {
        oldPlayer.pause();
        oldPlayer.remove();
      } catch {
        // Ignore cleanup errors
      }
    }

    // Create fresh player (audio is already cached locally, so this is fast)
    const playerOptions: AudioPlayerOptions = {
      updateInterval: 500,
    };
    const newPlayer = createAudioPlayer(audioUrl, playerOptions);

    return newPlayer;
  }

  /**
   * Start playing a track
   * @param track - The audio track to play
   * @param options - Playback options for optimization
   */
  async play(
    track: EnhancedAudioTrack,
    options: {
      skipPolling?: boolean;
      immediateStatus?: boolean;
      skipLoadingState?: boolean;
      isRetry?: boolean;
    } = {},
  ): Promise<boolean> {
    try {
      // Throttled session activation: Only activate if not recently activated (5s window)
      // Reduces redundant calls during practice sessions while maintaining iOS reliability
      const now = Date.now();
      if (now - this.lastActivationTime > this.ACTIVATION_THROTTLE) {
        await this.safeActivateAudioSession({
          location: 'play',
          isPlaying: false, // Not playing yet, but about to
          isPlaylistMode: false,
        });
      }

      // Configure audio session first (should be pre-configured for faster playback)
      await this.configureAudioSession();

      // Create fresh player (old player already cleaned up in createFreshPlayer)
      this.currentPlayer = await this.createFreshPlayer(track.audioUrl);
      this.currentTrack = track;

      // IMMEDIATE FEEDBACK: Update status to loading right away
      // RESET: Ensure progress starts from 0 for new tracks
      // FLICKER FIX: Skip loading state for playlist starts (audio is cached, loads instantly)
      if (!options.skipLoadingState) {
        this.updateStatus({
          isLoading: true,
          isPlaying: false,
          currentTrack: this.currentTrack,
          currentTime: 0,
          duration: 0,
          isLoaded: false,
          isBuffering: true,
          playbackState: 'idle',
          timeControlStatus: 'paused',
          reasonForWaitingToPlay: '',
          didJustFinish: false,
        });
      }

      // Set up event subscription BEFORE playing to catch immediate failures
      if (!options.skipPolling) {
        this.startEventSubscription();
      }

      // CRITICAL FIX: Wait for player to be ready using native status updates
      // This prevents ~1-20% of playback failures where play() is called before player is initialized
      await this.waitForPlayerReady();

      // Start playback (fresh player starts at position 0)
      // Wrap in try-catch to handle cases where play() fails even after ready check
      try {
        this.currentPlayer.play();
      } catch (playError) {
        // If play() fails synchronously, throw to trigger retry logic
        throw new Error(`Failed to start playback: ${playError}`);
      }

      // Update status to playing (actual state will come from event subscription)
      // Note: Native states (isLoaded, isBuffering) will be updated by event subscription
      this.updateStatus({
        isPlaying: true,
        currentTrack: this.currentTrack,
        currentTime: 0,
        duration: 0,
      });

      return true;
    } catch (error) {
      // RESET: Clear progress on play error
      this.updateStatus(RESET_AUDIO_STATUS);

      if (this.currentPlayer) {
        try {
          await this.stopInternal();
        } catch {
          // Ignore cleanup errors
        }
      }

      // CRITICAL FIX: Try to recover from audio session corruption (only on first attempt)
      if (!options.isRetry) {
        try {
          await this.resetAudioSession();

          // Retry playback once after reset with isRetry flag to prevent infinite recursion
          const retrySuccess = await this.play(track, { ...options, isRetry: true });
          if (retrySuccess) {
            return true;
          }
        } catch {
          // Reset failed, continue with error handling
        }
      }

      handleError(error as Error, { toastMessage: 'Failed to start audio playback' });
      return false;
    }
  }

  /**
   * PLAYLIST SUPPORT: Start playing a playlist of tracks
   */
  async playPlaylist(
    tracks: EnhancedAudioTrack[],
    onTrackComplete?: (nextTrack: EnhancedAudioTrack | null) => void,
  ): Promise<boolean> {
    if (!tracks.length) {
      return false;
    }

    try {
      this.playlist = [...tracks];
      this.currentPlaylistIndex = 0;
      this.isPlaylistMode = true;
      this.onPlaylistTrackComplete = onTrackComplete || null;
      this.initialPlaylistLength = tracks.length; // Store initial playlist length

      // Reset sleep timer expired flag when starting new playlist
      this.resetSleepTimerExpired();

      // Start with the first track
      const firstTrack = tracks[0];
      if (!firstTrack) {
        return false;
      }

      // FLICKER FIX: Skip loading state since audio is cached (prevents loading → playing flash)
      return await this.play(firstTrack, { skipLoadingState: true });
    } catch (error) {
      this.isPlaylistMode = false;
      this.playlist = [];
      this.currentPlaylistIndex = 0;
      this.onPlaylistTrackComplete = null;
      this.initialPlaylistLength = 0;
      this.resetSleepTimerExpired();
      throw error;
    }
  }

  /**
   * PLAYLIST SUPPORT: Advance to the next track in the playlist
   */
  private async advanceToNextTrack(): Promise<boolean> {
    if (!this.isPlaylistMode || !this.playlist.length) {
      return false;
    }

    this.currentPlaylistIndex++;

    if (this.currentPlaylistIndex >= this.playlist.length) {
      // Playlist is complete
      this.resetPlaylistState();

      // Stop playback and notify completion
      await this.stop();
      return false;
    }

    // Play transition sound between tracks if playlist has more than 1 track
    if (this.initialPlaylistLength > 1) {
      // CRITICAL: Pause current player to release audio session for transition sound
      // Without this, the transition sound fails to acquire the audio session
      if (this.currentPlayer) {
        try {
          this.currentPlayer.pause();
        } catch {
          // Ignore pause errors - transition sound will still attempt to play
        }
      }

      await playTransitionSound();
    }

    // Play the next track
    const nextTrack = this.playlist[this.currentPlaylistIndex];
    if (nextTrack) {
      const success = await this.play(nextTrack);
      if (success && this.onPlaylistTrackComplete) {
        this.onPlaylistTrackComplete(nextTrack);
      }
      return success;
    }

    return false;
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    try {
      // IMMEDIATE FEEDBACK: Update status immediately when stop is called
      this.updateStatus({ isPlaying: false, isLoading: false });

      // PLAYLIST SUPPORT: Reset playlist state when stopping
      this.resetPlaylistState();

      await this.stopInternal();
      // RESET: Clear all progress and track data when stopping
      this.resetStatus();
    } catch (stopError) {
      // RESET: Even on error, ensure all progress is cleared
      this.resetStatus();
      // Re-throw to make the error visible
      throw new Error(`Failed to stop audio playback: ${stopError}`);
    }
  }

  /**
   * Seek to position
   */
  async seekTo(position: number): Promise<void> {
    try {
      if (this.currentPlayer) {
        await this.currentPlayer.seekTo(position);
        this.updateStatus({ currentTime: position });
      }
    } catch (seekError) {
      // Re-throw to make the error visible
      throw new Error(`Failed to seek audio playback: ${seekError}`);
    }
  }

  /**
   * Get current status
   */
  getStatus(): AudioStatus {
    return { ...this.status };
  }

  /**
   * PLAYLIST SUPPORT: Get playlist information
   */
  getPlaylistInfo(): { isPlaylistMode: boolean; currentIndex: number; totalTracks: number } {
    return {
      isPlaylistMode: this.isPlaylistMode,
      currentIndex: this.currentPlaylistIndex,
      totalTracks: this.playlist.length,
    };
  }

  /**
   * SLEEP TIMER SUPPORT: Mark that sleep timer has expired
   */
  markSleepTimerExpired(): void {
    this.sleepTimerExpired = true;
  }

  /**
   * SLEEP TIMER SUPPORT: Check if sleep timer has expired
   */
  isSleepTimerExpired(): boolean {
    return this.sleepTimerExpired;
  }

  /**
   * SLEEP TIMER SUPPORT: Reset sleep timer expired flag
   */
  resetSleepTimerExpired(): void {
    this.sleepTimerExpired = false;
  }

  /**
   * Subscribe to status updates
   */
  subscribe(listener: (status: AudioStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to native player events for status updates
   */
  private startEventSubscription(): void {
    // Clear existing subscription
    this.stopEventSubscription();

    if (!this.currentPlayer) {
      return;
    }

    // Subscribe to native playback status updates
    this.eventSubscription = this.currentPlayer.addListener(
      PLAYBACK_STATUS_UPDATE,
      (nativeStatus: {
        playing?: boolean;
        currentTime?: number;
        duration?: number;
        bufferedPosition?: number;
        isLoaded?: boolean;
        isBuffering?: boolean;
        playbackState?: string;
        timeControlStatus?: string;
        reasonForWaitingToPlay?: string;
        didJustFinish?: boolean;
      }) => {
        try {
          // Extract all native values from expo-audio playbackStatusUpdate
          const isPlaying = nativeStatus.playing ?? false;
          const currentTime = nativeStatus.currentTime ?? 0;
          const duration = nativeStatus.duration ?? 0;
          const isLoaded = nativeStatus.isLoaded ?? false;
          const isBuffering = nativeStatus.isBuffering ?? false;
          const playbackState = nativeStatus.playbackState ?? 'unknown';
          const timeControlStatus = nativeStatus.timeControlStatus ?? 'paused';
          const reasonForWaitingToPlay = nativeStatus.reasonForWaitingToPlay ?? '';
          const didJustFinish = nativeStatus.didJustFinish ?? false;

          // Derive isLoading from native states (more accurate than custom logic)
          const isLoading = !isLoaded || isBuffering;

          // Add safety checks for invalid values
          const safeCurrentTime =
            isNaN(currentTime) || !isFinite(currentTime) ? 0 : Math.max(0, currentTime);
          const safeDuration = isNaN(duration) || !isFinite(duration) ? 0 : Math.max(0, duration);

          // PLAYLIST SUPPORT: Use native didJustFinish for track completion
          if (this.isPlaylistMode && didJustFinish) {
            // RACE CONDITION GUARD: Prevent duplicate advancement from rapid-fire events
            if (this.isAdvancingTrack) {
              return; // Already advancing, ignore duplicate event
            }

            // Don't advance if sleep timer has expired
            if (this.sleepTimerExpired) {
              // Sleep timer expired - stop playlist instead of advancing
              this.resetPlaylistState();
              this.stop().catch(() => {
                // Stop failed - continue with current track
              });
              return;
            }

            // Mark as advancing before async operation
            this.isAdvancingTrack = true;

            // Track just finished, advance to next track
            this.advanceToNextTrack()
              .catch(() => {
                // Track advancement failed - continue with current track
              })
              .finally(() => {
                this.isAdvancingTrack = false; // Reset guard
              });
            return;
          }

          // SINGLE TRACK SUPPORT: Use native didJustFinish for completion
          if (!this.isPlaylistMode && didJustFinish) {
            // Single track has finished playing, reset status but keep player for potential replay
            this.stopEventSubscription();
            this.updateStatus({
              isPlaying: false,
              isLoading: false,
              currentTime: safeDuration,
              duration: safeDuration,
              isLoaded,
              isBuffering: false,
              playbackState: 'ended',
              timeControlStatus,
              reasonForWaitingToPlay,
              didJustFinish: true,
            });
            return;
          }

          // Only update if values have changed meaningfully (reduce UI churn but stay smooth)
          const hasChanged =
            Math.abs(this.status.currentTime - safeCurrentTime) > 0.1 ||
            Math.abs(this.status.duration - safeDuration) > 0.1 ||
            this.status.isPlaying !== isPlaying ||
            this.status.isLoaded !== isLoaded ||
            this.status.isBuffering !== isBuffering;

          if (hasChanged) {
            this.updateStatus({
              isPlaying,
              currentTime: safeCurrentTime,
              duration: safeDuration,
              isLoading,
              isLoaded,
              isBuffering,
              playbackState,
              timeControlStatus,
              reasonForWaitingToPlay,
              didJustFinish,
            });
          }
        } catch {
          // Stop subscription on error
          this.stopEventSubscription();
          // RESET: Clear progress on event error
          this.updateStatus(RESET_AUDIO_STATUS);
        }
      },
    );
  }

  /**
   * Stop event subscription
   */
  private stopEventSubscription(): void {
    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
  }

  /**
   * Internal stop method
   */
  private async stopInternal(): Promise<void> {
    this.stopEventSubscription();

    if (this.currentPlayer) {
      const player = this.currentPlayer;
      this.currentPlayer = null;
      this.currentTrack = null;

      try {
        // Properly dispose of player to free memory
        player.pause();
        player.remove();
      } catch {
        // Silent failure - callers don't always catch
      }
    } else {
      this.currentTrack = null;
    }
  }

  /**
   * Update audio status and notify listeners
   * Native updateInterval (500ms) handles throttling automatically
   */
  private updateStatus(updates: Partial<AudioStatus>): void {
    this.status = { ...this.status, ...updates };

    // Create a copy of listeners to avoid modification during iteration
    const listenersCopy = new Set(this.listeners);

    // Notify all listeners
    listenersCopy.forEach(listener => {
      try {
        listener(this.status);
      } catch {
        // Remove problematic listeners
        this.listeners.delete(listener);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.stopInternal();

    // Clear all listeners to prevent memory leaks
    this.listeners.clear();

    // Clean up AppState listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Best-effort to release audio session
    // Don't throw errors during cleanup - they're not critical
    try {
      await setIsAudioActiveAsync(false);
    } catch {
      // Silently ignore cleanup errors - audio session will be released when app terminates
    }

    // Reset internal state to prevent stale references
    this.audioSessionConfigured = false;
    this.isPlaylistMode = false;
    this.playlist = [];
    this.currentPlaylistIndex = 0;
    this.onPlaylistTrackComplete = null;
    this.initialPlaylistLength = 0;
  }
}

export interface AudioStatus {
  // Player state
  isPlaying: boolean;
  isLoading: boolean; // Derived from !isLoaded || isBuffering
  currentTime: number;
  duration: number;
  currentTrack: EnhancedAudioTrack | null;

  // Native expo-audio states (from AudioPlayer.playbackStatusUpdate)
  isLoaded: boolean; // Whether audio has finished loading and is ready to play
  isBuffering: boolean; // Whether player is currently buffering data
  playbackState: string; // 'ready' | 'ended' | 'buffering' | 'idle' | 'unknown'
  timeControlStatus: string; // 'playing' | 'paused' | 'waiting'
  reasonForWaitingToPlay: string; // Why player is waiting (if applicable)
  didJustFinish: boolean; // Whether audio just finished playing
}

// Export singleton instance
export const simpleAudioService = new SimpleAudioService();
