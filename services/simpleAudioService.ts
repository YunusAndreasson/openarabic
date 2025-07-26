import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

/**
 * Simple audio service - single source of truth for native audio player
 */
class SimpleAudioService {
  private currentPlayer: any = null;
  private currentTrack: EnhancedAudioTrack | null = null;
  private listeners: Set<(status: AudioStatus) => void> = new Set();
  private statusPollingInterval: ReturnType<typeof setInterval> | null = null;
  private loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  private audioSessionConfigured = false;

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
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      this.audioSessionConfigured = true;
    } catch {
      // Audio session configuration failed - handle silently
    }
  }

  /**
   * Start playing a track
   */
  async play(track: EnhancedAudioTrack): Promise<boolean> {
    try {
      // Configure audio session first
      await this.configureAudioSession();

      // Stop any existing player
      if (this.currentPlayer) {
        await this.stopInternal();
      }

      // Create player
      this.currentPlayer = createAudioPlayer(track.audioUrl);
      this.currentTrack = track;

      // Update status to loading
      this.updateStatus({ isLoading: true, isPlaying: false, currentTrack: this.currentTrack });

      // Start playback
      await this.currentPlayer.play();

      // Start polling for status updates
      this.startStatusPolling();

      // Set loading timeout
      this.loadingTimeout = setTimeout(() => {
        if (this.status.isLoading) {
          this.updateStatus({ isLoading: false, isPlaying: false });
          this.stopStatusPolling();
        }
      }, 10000);

      return true;
    } catch (error) {
      this.updateStatus({ isLoading: false, isPlaying: false });

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
   * Stop playback
   */
  async stop(): Promise<void> {
    try {
      await this.stopInternal();
      this.updateStatus({ isPlaying: false, isLoading: false, currentTrack: null });
    } catch {
      this.updateStatus({ isPlaying: false, isLoading: false, currentTrack: null });
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
    } catch {
      this.updateStatus({ isPlaying: false });
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
    } catch {
      this.updateStatus({ isPlaying: false });
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
    } catch {
      // Ignore seek errors
    }
  }

  /**
   * Get current status
   */
  getStatus(): AudioStatus {
    return { ...this.status };
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

    // Reduce polling frequency to prevent issues
    this.statusPollingInterval = setInterval(() => {
      if (this.currentPlayer) {
        try {
          const isPlaying = this.currentPlayer.playing || this.currentPlayer.isPlaying || false;
          const currentTime = this.currentPlayer.currentTime || this.currentPlayer.position || 0;
          const duration = this.currentPlayer.duration || this.currentPlayer.durationMillis || 0;

          // Add safety checks for invalid values
          const safeCurrentTime =
            isNaN(currentTime) || !isFinite(currentTime) ? 0 : Math.max(0, currentTime);
          const safeDuration = isNaN(duration) || !isFinite(duration) ? 0 : Math.max(0, duration);

          // Only update if values have changed significantly
          const hasChanged =
            Math.abs(this.status.currentTime - safeCurrentTime) > 0.5 ||
            Math.abs(this.status.duration - safeDuration) > 0.5 ||
            this.status.isPlaying !== isPlaying;

          if (hasChanged) {
            this.updateStatus({
              isPlaying,
              currentTime: safeCurrentTime,
              duration: safeDuration,
              isLoading: false,
            });
          }
        } catch {
          // Stop polling on error
          this.stopStatusPolling();
          this.updateStatus({ isPlaying: false, isLoading: false });
        }
      }
    }, 1000);
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
      } catch {
        // Ignore cleanup errors
      }
      this.currentPlayer = null;
    }
    this.currentTrack = null;
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(updates: Partial<AudioStatus>): void {
    this.status = { ...this.status, ...updates };

    // Create a copy of listeners to avoid modification during iteration
    const listenersCopy = new Set(this.listeners);

    // Notify all listeners
    listenersCopy.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        // Remove problematic listeners and log error for debugging
        this.listeners.delete(listener);
        // Only log in development to avoid console noise in production
        if (__DEV__) {
          console.warn('Removed problematic audio listener:', error);
        }
      }
    });
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.stopInternal();
    this.listeners.clear();
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
