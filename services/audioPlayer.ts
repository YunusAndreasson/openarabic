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

/**
 * Simple audio service - single source of truth for native audio player
 */

class SimpleAudioService {
  private currentPlayer: AudioPlayer | null = null;
  private currentTrack: EnhancedAudioTrack | null = null;
  private listeners: Set<(status: AudioStatus) => void> = new Set();
  private eventSubscription: { remove: () => void } | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private stuckCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private audioSessionConfigured = false;

  // Player cache to avoid recreation for frequently played audio
  private playerCache: Map<string, AudioPlayer> = new Map();
  private readonly MAX_CACHE_SIZE = 5; // Reduced for simplicity

  // STABILIZATION: Add state transition smoothing
  private lastStatusUpdate = 0;
  private statusUpdateThrottle = 100; // 100ms for responsive button state updates (especially for short audio)

  // PLAYLIST SUPPORT: Add playlist state management
  private playlist: EnhancedAudioTrack[] = [];
  private currentPlaylistIndex = 0;
  private isPlaylistMode = false;
  private onPlaylistTrackComplete: ((nextTrack: EnhancedAudioTrack | null) => void) | null = null;
  private initialPlaylistLength = 0; // Track initial playlist size for transition sound logic

  // SLEEP TIMER SUPPORT: Track when sleep timer has expired
  private sleepTimerExpired = false;

  // DIAGNOSTIC: Track if we've already retried play() for this track
  private hasRetriedPlay = false;

  // APP STATE SUPPORT: Track app state for background audio handling
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  // Current audio status
  private status: AudioStatus = {
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
  };

  /**
   * Configure audio session for proper playback
   */
  private async configureAudioSession(): Promise<void> {
    if (this.audioSessionConfigured) {
      return;
    }

    try {
      // Ensure audio is active at the OS level
      try {
        await setIsAudioActiveAsync(true);
      } catch {
        // Continue with audio mode setup even if this fails
      }

      await setAudioModeAsync({
        // Common
        shouldPlayInBackground: true,
        // iOS
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: 'duckOthers',
        // Android
        interruptionModeAndroid: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

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
          if (this.status.isPlaying || this.isPlaylistMode) {
            await setIsAudioActiveAsync(true);
            // Re-configure audio session to maintain background playback
            await setAudioModeAsync({
              shouldPlayInBackground: true,
              playsInSilentMode: true,
              allowsRecording: false,
              interruptionMode: 'duckOthers',
              interruptionModeAndroid: 'duckOthers',
              shouldRouteThroughEarpiece: false,
            });
          }
        } else if (nextAppState === 'active') {
          // App is coming to foreground - ensure audio session is still active
          if (this.status.isPlaying || this.isPlaylistMode) {
            await setIsAudioActiveAsync(true);
          }
        }
      } catch (error) {
        // Don't throw errors from AppState listener as it can cause crashes
        console.warn('AppState audio handling error:', error);
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

      // Preserve player cache to keep startup fast across sessions.
      // Cache eviction is handled separately by MAX_CACHE_SIZE and manual clear in Account.

      // Reset audio session configuration
      this.audioSessionConfigured = false;

      // Reconfigure audio session
      await this.configureAudioSession();

      // Reset status
      this.updateStatus({
        isPlaying: false,
        isLoading: false,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
      });
    } catch (error) {
      // Even if reset fails, clear the configuration flag to force reconfiguration
      this.audioSessionConfigured = false;
      throw new Error(`Audio session reset failed: ${error}`);
    }
  }

  /**
   * Validate player state to detect corruption
   */
  private isPlayerHealthy(player: AudioPlayer): boolean {
    try {
      const currentTime = player.currentTime;
      const duration = player.duration;
      return !isNaN(currentTime) && !isNaN(duration) && isFinite(currentTime) && isFinite(duration);
    } catch {
      return false;
    }
  }

  /**
   * Create or reuse audio player for a track
   */
  private async createOrReusePlayer(audioUrl: string): Promise<AudioPlayer> {
    // If we have an existing player with the same audio URL, check if it's healthy
    if (this.currentPlayer && this.currentTrack?.audioUrl === audioUrl) {
      if (this.isPlayerHealthy(this.currentPlayer)) {
        return this.currentPlayer;
      } else {
        this.currentPlayer = null;
        this.currentTrack = null;
      }
    }

    // Check cache for recently used players
    const cachedPlayer = this.playerCache.get(audioUrl);
    if (cachedPlayer) {
      if (this.isPlayerHealthy(cachedPlayer)) {
        return cachedPlayer;
      } else {
        this.playerCache.delete(audioUrl);
        try {
          cachedPlayer.remove();
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    // Stop previous playback to prevent overlapping audio
    if (this.currentPlayer) {
      const previousPlayer = this.currentPlayer;

      // Null references immediately to avoid races with new player state
      this.currentPlayer = null;
      this.currentTrack = null;

      // Pause previous player to prevent audio overlap
      try {
        previousPlayer.pause();
      } catch {
        // Ignore pause errors
      }

      // Clear any existing event subscription from the previous session
      this.stopEventSubscription();
    }

    // Create new player immediately with optimized options
    const playerOptions: AudioPlayerOptions = {
      updateInterval: 500, // Match our previous polling interval for consistency
    };
    const newPlayer = createAudioPlayer(audioUrl, playerOptions);

    // Cache player for potential reuse with proper cleanup
    if (this.playerCache.size >= this.MAX_CACHE_SIZE) {
      // Evict oldest player - fire-and-forget cleanup to not block new player creation
      const firstKey = this.playerCache.keys().next().value;
      if (firstKey) {
        const evictedPlayer = this.playerCache.get(firstKey);
        this.playerCache.delete(firstKey);

        // Clean up evicted player asynchronously (don't block new player creation)
        if (evictedPlayer) {
          (async () => {
            try {
              evictedPlayer.remove();
            } catch {
              // Ignore cleanup errors
            }
          })();
        }
      }
    }
    this.playerCache.set(audioUrl, newPlayer);

    return newPlayer;
  }

  /**
   * Start playing a track
   * @param track - The audio track to play
   * @param options - Playback options for optimization
   */
  async play(
    track: EnhancedAudioTrack,
    options: { skipPolling?: boolean; immediateStatus?: boolean; skipLoadingState?: boolean } = {}
  ): Promise<boolean> {
    try {
      // CRITICAL: Ensure audio session is active before EVERY play attempt
      // This fixes issues where iOS deactivates the session between plays
      try {
        await setIsAudioActiveAsync(true);
      } catch {
        // Try to continue anyway
      }

      // Configure audio session first (should be pre-configured for faster playback)
      await this.configureAudioSession();

      // Create or reuse player
      this.currentPlayer = await this.createOrReusePlayer(track.audioUrl);
      this.currentTrack = track;

      // Reset retry flag for new track
      this.hasRetriedPlay = false;

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
        });
      }

      // Always seek to beginning to ensure fresh playback state
      // This ensures PLAY ALL always starts from position 0
      if (this.currentPlayer) {
        try {
          await this.currentPlayer.seekTo(0);
        } catch {
          // Continue anyway - seek failure shouldn't block playback
        }
      }

      // Set up event subscription BEFORE playing to catch immediate failures
      if (!options.skipPolling) {
        this.startEventSubscription();
      }

      // Start playback
      this.currentPlayer.play();

      // Update status to playing (actual state will come from event subscription)
      this.updateStatus({
        isLoading: false,
        isPlaying: true,
        currentTrack: this.currentTrack,
        currentTime: 0,
        duration: 0,
      });

      // Set shorter loading timeout since audio should be cached
      this.loadingTimeout = setTimeout(() => {
        if (this.status.isLoading) {
          // RESET: Clear progress on loading timeout
          this.updateStatus({
            isLoading: false,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          });
          this.stopEventSubscription();
        }
      }, 3000); // Reduced from 10s to 3s for cached audio

      // HEALTH CHECK: Verify player actually started playing
      this.scheduleHealthCheck();

      return true;
    } catch (error) {
      // RESET: Clear progress on play error
      this.updateStatus({
        isLoading: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      });

      if (this.currentPlayer) {
        try {
          await this.stopInternal();
        } catch {
          // Ignore cleanup errors
        }
      }

      // CRITICAL FIX: Try to recover from audio session corruption
      try {
        await this.resetAudioSession();

        // Retry playback once after reset
        const retrySuccess = await this.play(track, options);
        if (retrySuccess) {
          return true;
        }
      } catch {
        // Reset failed, continue with error handling
      }

      handleError(error as Error, { toastMessage: 'Failed to start audio playback' });
      return false;
    }
  }

  /**
   * Schedule a health check to verify player actually started
   */
  private scheduleHealthCheck(): void {
    // Clear any existing health check
    if (this.stuckCheckTimeout) {
      clearTimeout(this.stuckCheckTimeout);
    }

    // Wait 500ms then check if player is actually playing
    this.stuckCheckTimeout = setTimeout(() => {
      if (!this.currentPlayer) {
        return;
      }

      // Silent health check - no action needed, just for monitoring
      // The event subscription retry mechanism handles failures automatically
    }, 500); // Wait 500ms for player to start
  }

  /**
   * PLAYLIST SUPPORT: Start playing a playlist of tracks
   */
  async playPlaylist(
    tracks: EnhancedAudioTrack[],
    onTrackComplete?: (nextTrack: EnhancedAudioTrack | null) => void
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
      this.isPlaylistMode = false;
      this.playlist = [];
      this.currentPlaylistIndex = 0;
      this.onPlaylistTrackComplete = null;
      this.initialPlaylistLength = 0;
      this.resetSleepTimerExpired();

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
      this.isPlaylistMode = false;
      this.playlist = [];
      this.currentPlaylistIndex = 0;
      this.onPlaylistTrackComplete = null;
      this.initialPlaylistLength = 0;

      // SLEEP TIMER SUPPORT: Reset sleep timer expired flag when stopping
      this.resetSleepTimerExpired();

      // DIAGNOSTIC: Reset retry flag when stopping
      this.hasRetriedPlay = false;

      await this.stopInternal();
      // RESET: Clear all progress and track data when stopping
      this.updateStatus({
        isPlaying: false,
        isLoading: false,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
      });
    } catch (stopError) {
      // RESET: Even on error, ensure all progress is cleared
      this.updateStatus({
        isPlaying: false,
        isLoading: false,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
      });
      // Re-throw to make the error visible
      throw new Error(`Failed to stop audio playback: ${stopError}`);
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    try {
      if (this.currentPlayer) {
        this.currentPlayer.pause();
        this.updateStatus({ isPlaying: false });
      }
    } catch (pauseError) {
      this.updateStatus({ isPlaying: false });
      // Re-throw to make the error visible
      throw new Error(`Failed to pause audio playback: ${pauseError}`);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    try {
      if (this.currentPlayer) {
        this.currentPlayer.play();
        this.updateStatus({ isPlaying: true });
      }
    } catch (resumeError) {
      this.updateStatus({ isPlaying: false });
      // Re-throw to make the error visible
      throw new Error(`Failed to resume audio playback: ${resumeError}`);
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
      (nativeStatus: any) => {
        try {
          // Extract values from native status
          const isPlaying = nativeStatus.playing ?? false;
          const currentTime = nativeStatus.currentTime ?? 0;
          const duration = nativeStatus.duration ?? 0;

          // CRITICAL FIX: If player not playing at start, retry play() ONCE
          // This fixes the intermittent issue where native player doesn't start
          // Only retry once per track to avoid glitchy multiple retries
          // Only retry if currentTime is 0 (actual startup failure, not transient pause)
          if (!this.status.duration || currentTime < 1) {
            if (!isPlaying && !this.hasRetriedPlay && currentTime < 0.1) {
              this.hasRetriedPlay = true;

              if (this.currentPlayer) {
                // Small delay to let player stabilize before retry
                setTimeout(() => {
                  if (this.currentPlayer) {
                    this.currentPlayer.play();
                  }
                }, 50); // 50ms delay
              }
            }
          }

          // Add safety checks for invalid values
          const safeCurrentTime = isNaN(currentTime) || !isFinite(currentTime) ? 0 : Math.max(0, currentTime);
          const safeDuration = isNaN(duration) || !isFinite(duration) ? 0 : Math.max(0, duration);

          // PLAYLIST SUPPORT: Check if current track has completed
          if (this.isPlaylistMode && safeDuration > 0 && safeCurrentTime >= safeDuration - 0.5) {
            // Don't advance if sleep timer has expired
            if (this.sleepTimerExpired) {
              // Sleep timer expired - stop playlist instead of advancing
              this.isPlaylistMode = false;
              this.playlist = [];
              this.currentPlaylistIndex = 0;
              this.onPlaylistTrackComplete = null;
              this.initialPlaylistLength = 0;
              this.resetSleepTimerExpired();
              this.stop().catch(() => {
                // Stop failed - continue with current track
              });
              return;
            }

            // Track is within 0.5 seconds of completion, advance to next track
            this.advanceToNextTrack().catch(() => {
              // Track advancement failed - continue with current track
            });
            return;
          }

          // SINGLE TRACK SUPPORT: Check if current single track has completed
          if (!this.isPlaylistMode && safeDuration > 0 && safeCurrentTime >= safeDuration - 0.1) {
            // Single track has finished playing, reset status but keep player for potential replay
            this.stopEventSubscription();
            this.updateStatus({
              isPlaying: false,
              isLoading: false,
              currentTime: safeDuration, // Set to full duration
              duration: safeDuration,
            });
            return;
          }

          // Only update if values have changed meaningfully (reduce UI churn but stay smooth)
          const hasChanged =
            Math.abs(this.status.currentTime - safeCurrentTime) > 0.1 ||
            Math.abs(this.status.duration - safeDuration) > 0.1 ||
            this.status.isPlaying !== isPlaying;

          if (hasChanged) {
            this.updateStatus({
              isPlaying,
              currentTime: safeCurrentTime,
              duration: safeDuration,
              isLoading: false,
            });
          }
        } catch (eventError) {
          // Stop subscription on error
          this.stopEventSubscription();
          // RESET: Clear progress on event error
          this.updateStatus({
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
          });
          // Log error for debugging
          console.error('Audio event subscription failed:', eventError);
        }
      }
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
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  /**
   * Internal stop method
   */
  private async stopInternal(): Promise<void> {
    this.stopEventSubscription();

    if (this.currentPlayer) {
      try {
        // Just pause - keep player in cache for reuse
        // seekTo(0) on next play will reset position
        this.currentPlayer.pause();
      } catch (cleanupError) {
        // Log error instead of throwing (callers don't always catch)
        console.error('Audio cleanup failed:', cleanupError);
      }
      this.currentPlayer = null;
    }
    this.currentTrack = null;
  }

  /**
   * STABILIZATION: Enhanced status update with throttling to prevent rapid changes
   */
  private updateStatus(updates: Partial<AudioStatus>): void {
    const now = Date.now();

    // Throttle status updates to prevent rapid UI changes
    if (now - this.lastStatusUpdate < this.statusUpdateThrottle) {
      // Only allow critical updates (like stopping) to bypass throttling
      const isCriticalUpdate = updates.isPlaying === false || updates.isLoading === false;
      if (!isCriticalUpdate) {
        return;
      }
    }

    this.lastStatusUpdate = now;
    this.status = { ...this.status, ...updates };

    // Create a copy of listeners to avoid modification during iteration
    const listenersCopy = new Set(this.listeners);

    // Notify all listeners
    listenersCopy.forEach(listener => {
      try {
        listener(this.status);
      } catch (listenerError) {
        // Remove problematic listeners
        this.listeners.delete(listener);
        // Log error instead of throwing (can't throw from forEach)
        console.error('Audio status listener failed:', listenerError);
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

    // Clear player cache and clean up cached players
    for (const player of this.playerCache.values()) {
      try {
        player.remove();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.playerCache.clear();

    // Best-effort to release audio session
    try {
      await setIsAudioActiveAsync(false);
    } catch (destroyError) {
      // Re-throw to make the error visible
      throw new Error(`Failed to release audio session during destroy: ${destroyError}`);
    }

    // Reset internal state to prevent stale references
    this.audioSessionConfigured = false;
    this.lastStatusUpdate = 0;
    this.isPlaylistMode = false;
    this.playlist = [];
    this.currentPlaylistIndex = 0;
    this.onPlaylistTrackComplete = null;
    this.initialPlaylistLength = 0;
  }
}

export interface AudioStatus {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  currentTrack: EnhancedAudioTrack | null;
}

// Export singleton instance
export const simpleAudioService = new SimpleAudioService();
