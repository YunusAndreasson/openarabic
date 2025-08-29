import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

/**
 * Simple audio service - single source of truth for native audio player
 */
type BasicAudioPlayer = {
  play?: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
  seekTo?: (position: number) => Promise<void> | void;
  remove?: () => Promise<void> | void;
  playing?: boolean;
  isPlaying?: boolean;
  currentTime?: number;
  position?: number;
  duration?: number;
  durationMillis?: number;
};

class SimpleAudioService {
  private currentPlayer: BasicAudioPlayer | null = null;
  private currentTrack: EnhancedAudioTrack | null = null;
  private listeners: Set<(status: AudioStatus) => void> = new Set();
  private statusPollingInterval: ReturnType<typeof setInterval> | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private audioSessionConfigured = false;

  // STABILIZATION: Add state transition smoothing
  private lastStatusUpdate = 0;
  private statusUpdateThrottle = 400; // Slightly coarser to reduce UI churn without hurting UX

  // PLAYLIST SUPPORT: Add playlist state management
  private playlist: EnhancedAudioTrack[] = [];
  private currentPlaylistIndex = 0;
  private isPlaylistMode = false;
  private onPlaylistTrackComplete: ((nextTrack: EnhancedAudioTrack | null) => void) | null = null;

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
    if (this.audioSessionConfigured) return;

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
      this.audioSessionConfigured = true;
    } catch (sessionError) {
      // This is critical - audio may not work properly
      throw new Error(`Audio session configuration failed: ${sessionError}`);
    }
  }

  /**
   * Create or reuse audio player for a track
   */
  private async createOrReusePlayer(audioUrl: string): Promise<BasicAudioPlayer> {
    // If we have an existing player with the same audio URL, reuse it
    if (this.currentPlayer && this.currentTrack?.audioUrl === audioUrl) {
      return this.currentPlayer;
    }

    // Stop and remove existing player if it's different
    if (this.currentPlayer) {
      await this.stopInternal();
    }

    // Create new player
    const newPlayer = createAudioPlayer(audioUrl);
    return newPlayer;
  }

  /**
   * Start playing a track
   */
  async play(track: EnhancedAudioTrack): Promise<boolean> {
    try {
      // Configure audio session first
      await this.configureAudioSession();

      // Create or reuse player
      this.currentPlayer = await this.createOrReusePlayer(track.audioUrl);
      this.currentTrack = track;

      // IMMEDIATE FEEDBACK: Update status to loading right away
      // RESET: Ensure progress starts from 0 for new tracks
      this.updateStatus({
        isLoading: true,
        isPlaying: false,
        currentTrack: this.currentTrack,
        currentTime: 0,
        duration: 0,
      });

      // Start playback
      await this.currentPlayer.play?.();

      // IMMEDIATE FEEDBACK: Update to playing state immediately after play() succeeds
      this.updateStatus({ isLoading: false, isPlaying: true });

      // Start polling for status updates with optimized interval
      this.startStatusPolling();

      // Set loading timeout as fallback
      this.loadingTimeout = setTimeout(() => {
        if (this.status.isLoading) {
          // RESET: Clear progress on loading timeout
          this.updateStatus({
            isLoading: false,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          });
          this.stopStatusPolling();
        }
      }, 10000);

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

      handleError(error as Error, { toastMessage: 'Failed to start audio playback' });
      return false;
    }
  }

  /**
   * PLAYLIST SUPPORT: Start playing a playlist of tracks
   */
  async playPlaylist(
    tracks: EnhancedAudioTrack[],
    onTrackComplete?: (nextTrack: EnhancedAudioTrack | null) => void
  ): Promise<boolean> {
    if (!tracks.length) return false;

    try {
      this.playlist = [...tracks];
      this.currentPlaylistIndex = 0;
      this.isPlaylistMode = true;
      this.onPlaylistTrackComplete = onTrackComplete || null;

      // Start with the first track
      const firstTrack = tracks[0];
      if (!firstTrack) return false;

      return await this.play(firstTrack);
    } catch (error) {
      this.isPlaylistMode = false;
      this.playlist = [];
      this.currentPlaylistIndex = 0;
      this.onPlaylistTrackComplete = null;
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

      // Stop playback and notify completion
      await this.stop();
      return false;
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
      if (this.currentPlayer && typeof this.currentPlayer.pause === 'function') {
        await this.currentPlayer.pause();
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
      if (this.currentPlayer && typeof this.currentPlayer.play === 'function') {
        await this.currentPlayer.play();
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
      if (this.currentPlayer && typeof this.currentPlayer.seekTo === 'function') {
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
   * Subscribe to status updates
   */
  subscribe(listener: (status: AudioStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start polling for player status updates
   */
  private startStatusPolling(): void {
    // Clear existing polling
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    // Balanced polling interval for smoother progress updates
    this.statusPollingInterval = setInterval(() => {
      if (this.currentPlayer) {
        try {
          const isPlaying = this.currentPlayer.playing || this.currentPlayer.isPlaying || false;
          // Normalize to seconds if millis provided
          const rawPosition = this.currentPlayer.currentTime ?? this.currentPlayer.position ?? 0;
          const rawDuration = this.currentPlayer.duration ?? this.currentPlayer.durationMillis ?? 0;

          const currentTimeSeconds =
            rawPosition > 1000 && rawPosition > 600 ? rawPosition / 1000 : rawPosition;
          const durationSeconds =
            rawDuration > 1000 && rawDuration > 600 ? rawDuration / 1000 : rawDuration;

          // Add safety checks for invalid values
          const safeCurrentTime =
            isNaN(currentTimeSeconds) || !isFinite(currentTimeSeconds)
              ? 0
              : Math.max(0, currentTimeSeconds);
          const safeDuration =
            isNaN(durationSeconds) || !isFinite(durationSeconds) ? 0 : Math.max(0, durationSeconds);

          // PLAYLIST SUPPORT: Check if current track has completed
          if (this.isPlaylistMode && safeDuration > 0 && safeCurrentTime >= safeDuration - 0.5) {
            // Track is within 0.5 seconds of completion, advance to next track
            this.advanceToNextTrack().catch(() => {
              // Track advancement failed - continue with current track
            });
            return;
          }

          // Only update if values have changed meaningfully (reduce UI churn but stay smooth)
          const hasChanged =
            Math.abs(this.status.currentTime - safeCurrentTime) > 0.3 ||
            Math.abs(this.status.duration - safeDuration) > 0.3 ||
            this.status.isPlaying !== isPlaying;

          if (hasChanged) {
            this.updateStatus({
              isPlaying,
              currentTime: safeCurrentTime,
              duration: safeDuration,
              isLoading: false,
            });
          }
        } catch (pollingError) {
          // Stop polling on error
          this.stopStatusPolling();
          // RESET: Clear progress on polling error
          this.updateStatus({
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
          });
          // Re-throw to make the error visible
          throw new Error(`Audio status polling failed: ${pollingError}`);
        }
      }
    }, 600);
  }

  /**
   * Stop status polling
   */
  private stopStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
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
    this.stopStatusPolling();

    if (this.currentPlayer) {
      try {
        if (typeof this.currentPlayer.pause === 'function') {
          await this.currentPlayer.pause();
        }
        if (typeof this.currentPlayer.remove === 'function') {
          await this.currentPlayer.remove();
        }
      } catch (cleanupError) {
        // Re-throw to make the error visible
        throw new Error(`Audio cleanup failed: ${cleanupError}`);
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
        // Re-throw to make the error visible
        throw new Error(`Audio status listener failed: ${listenerError}`);
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
