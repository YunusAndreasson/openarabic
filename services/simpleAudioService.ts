import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

/**
 * Simple audio service - single source of truth for native audio player
 * No complex state management, just direct player control
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
      });
      this.audioSessionConfigured = true;
    } catch (error) {
      console.log('⚠️ [SIMPLE AUDIO] Failed to configure audio session:', error);
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

      // Create new player if needed
      if (!this.currentPlayer || this.currentTrack?.audioUrl !== track.audioUrl) {
        this.currentPlayer = createAudioPlayer(track.audioUrl);
        this.currentTrack = track;
      }

      // Update status to loading
      this.updateStatus({ isLoading: true, isPlaying: false, currentTrack: track });

      // Start playback
      await this.currentPlayer.play();

      // Start polling for status updates since events aren't working reliably
      this.startStatusPolling();

      // Set timeout to stop loading if audio doesn't start within 10 seconds
      this.loadingTimeout = setTimeout(() => {
        if (this.status.isLoading) {
          this.updateStatus({ isLoading: false, isPlaying: false });
          this.stopStatusPolling();
        }
      }, 10000);

      return true;
    } catch (error) {
      console.log('❌ [SIMPLE AUDIO] Play failed:', error);
      this.updateStatus({ isLoading: false, isPlaying: false });
      handleError(error as Error, { toastMessage: 'Failed to start audio playback' });
      return false;
    }
  }

  /**
   * Start polling for player status updates
   */
  private startStatusPolling(): void {
    // Clear existing polling
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    // Poll every 100ms for status updates
    this.statusPollingInterval = setInterval(() => {
      if (this.currentPlayer) {
        try {
          // Get current status directly from player with extensive property checking
          const isPlaying = this.currentPlayer.playing || this.currentPlayer.isPlaying || false;
          const currentTime = this.currentPlayer.currentTime || this.currentPlayer.position || 0;
          const duration = this.currentPlayer.duration || 0;

          // Determine if we have valid playback data
          const hasValidData = duration > 0 || currentTime > 0 || isPlaying;

          // Update our status
          this.updateStatus({
            isPlaying,
            isLoading: !hasValidData && this.status.isLoading, // Keep loading until we have valid data
            currentTime,
            duration,
            currentTrack: this.currentTrack,
          });

          // Clear loading timeout if we have valid data
          if (hasValidData && this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
          }

          // Stop polling if audio stopped
          if (!isPlaying && this.status.isPlaying) {
            this.stopStatusPolling();
          }
        } catch (error) {
          console.log('⚠️ [SIMPLE AUDIO] Error polling status:', error);
        }
      }
    }, 100);
  }

  /**
   * Stop status polling
   */
  private stopStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  }

  /**
   * Clear loading timeout
   */
  private clearLoadingTimeout(): void {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  /**
   * Pause current playback
   */
  async pause(): Promise<void> {
    if (this.currentPlayer) {
      try {
        await this.currentPlayer.pause();
        this.updateStatus({ isPlaying: false });
      } catch (error) {
        handleError(error as Error, { toastMessage: 'Failed to pause audio' });
      }
    }
  }

  /**
   * Stop current playback completely
   */
  async stop(): Promise<void> {
    this.stopStatusPolling();
    this.clearLoadingTimeout();
    await this.stopInternal();
    this.updateStatus({
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      currentTrack: null,
    });
  }

  /**
   * Internal stop method
   */
  private async stopInternal(): Promise<void> {
    if (this.currentPlayer) {
      try {
        // Multiple stop attempts for reliability
        if (typeof this.currentPlayer.pause === 'function') {
          await this.currentPlayer.pause();
        }
        if (typeof this.currentPlayer.seekTo === 'function') {
          await this.currentPlayer.seekTo(0);
        }
        if (typeof this.currentPlayer.remove === 'function') {
          await this.currentPlayer.remove();
        }
      } catch (error) {
        console.log('⚠️ [SIMPLE AUDIO] Error cleaning up player:', error);
      } finally {
        this.currentPlayer = null;
        this.currentTrack = null;
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): AudioStatus {
    return this.status;
  }

  /**
   * Subscribe to status updates
   */
  subscribe(listener: (status: AudioStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.status);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(updates: Partial<AudioStatus>): void {
    this.status = { ...this.status, ...updates };

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.log('⚠️ [SIMPLE AUDIO] Listener error:', error);
      }
    });
  }

  /**
   * Cleanup on app close
   */
  async cleanup(): Promise<void> {
    this.stopStatusPolling();
    this.clearLoadingTimeout();
    await this.stopInternal();
    this.listeners.clear();
  }
}

// Audio status interface
interface AudioStatus {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  currentTrack: EnhancedAudioTrack | null;
}

// Export singleton instance
export const simpleAudioService = new SimpleAudioService();
export type { AudioStatus };
