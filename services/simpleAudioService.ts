import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

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
  private statusUpdateThrottle = 500; // Minimum 500ms between status updates

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

      // IMMEDIATE FEEDBACK: Update status to loading right away
      this.updateStatus({ isLoading: true, isPlaying: false, currentTrack: this.currentTrack });

      // Start playback
      await this.currentPlayer.play?.();

      // IMMEDIATE FEEDBACK: Update to playing state immediately after play() succeeds
      this.updateStatus({ isLoading: false, isPlaying: true });

      // Start polling for status updates with optimized interval
      this.startStatusPolling();

      // Set loading timeout as fallback
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
      // IMMEDIATE FEEDBACK: Update status immediately when stop is called
      this.updateStatus({ isPlaying: false, isLoading: false });

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

    // STABILIZATION: Reduced polling frequency from 250ms to 1000ms for better performance
    // This reduces rapid state changes that cause UI instability
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

          // STABILIZATION: Only update if values have changed significantly
          // Increased threshold from 0.5s to 1s to reduce rapid updates
          const hasChanged =
            Math.abs(this.status.currentTime - safeCurrentTime) > 1 ||
            Math.abs(this.status.duration - safeDuration) > 1 ||
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
    }, 1000); // Increased from 250ms to 1000ms for stability
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
