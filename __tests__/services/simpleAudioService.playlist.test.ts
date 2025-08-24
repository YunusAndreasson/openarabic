import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock expo-audio with a very simple mock
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    playing: true,
    isPlaying: true,
    currentTime: 0,
    duration: 100,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  setIsAudioActiveAsync: jest.fn(() => Promise.resolve()),
}));

// Mock error handling
jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// Mock the Image.prefetch that might be called
jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(() => Promise.resolve()),
  },
}));

// Now import the service after mocking
import { simpleAudioService } from '../../services/simpleAudioService';
import type { EnhancedAudioTrack } from '../../types/audio.types';

describe('SimpleAudioService Playlist Functionality', () => {
  const mockTrack1: EnhancedAudioTrack = {
    id: 'article-1',
    articleId: 1,
    audioUrl: 'https://example.com/audio1.mp3',
    title: 'Article 1',
    imageUrl: 'https://example.com/image1.jpg',
  };

  const mockTrack2: EnhancedAudioTrack = {
    id: 'article-2',
    articleId: 2,
    audioUrl: 'https://example.com/audio2.mp3',
    title: 'Article 2',
    imageUrl: 'https://example.com/image2.jpg',
  };

  const mockTrack3: EnhancedAudioTrack = {
    id: 'article-3',
    articleId: 3,
    audioUrl: 'https://example.com/audio3.mp3',
    title: 'Article 3',
    imageUrl: 'https://example.com/image3.jpg',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the service state
    try {
      await simpleAudioService.stop();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('playPlaylist', () => {
    it('should return false for empty playlist', async () => {
      const result = await simpleAudioService.playPlaylist([], jest.fn());
      expect(result).toBe(false);
    });

    it('should set playlist mode correctly', async () => {
      const tracks = [mockTrack1, mockTrack2];
      await simpleAudioService.playPlaylist(tracks, jest.fn());

      const playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(true);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(2);
    });

    it('should handle playlist with single track', async () => {
      const tracks = [mockTrack1];
      const onTrackComplete = jest.fn();

      const result = await simpleAudioService.playPlaylist(tracks, onTrackComplete);

      // Even if play fails, playlist mode should be set
      expect(simpleAudioService.getPlaylistInfo().isPlaylistMode).toBe(true);
      expect(simpleAudioService.getPlaylistInfo().totalTracks).toBe(1);
    });
  });

  describe('getPlaylistInfo', () => {
    it('should return correct playlist information', async () => {
      const tracks = [mockTrack1, mockTrack2, mockTrack3];
      await simpleAudioService.playPlaylist(tracks, jest.fn());

      const playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(true);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(3);
    });

    it('should return default values when not in playlist mode', () => {
      const playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo).toEqual({
        isPlaylistMode: false,
        currentIndex: 0,
        totalTracks: 0,
      });
    });
  });

  describe('stop', () => {
    it('should reset playlist state when stopping', async () => {
      const tracks = [mockTrack1, mockTrack2];
      await simpleAudioService.playPlaylist(tracks, jest.fn());

      // Verify playlist mode is active
      expect(simpleAudioService.getPlaylistInfo().isPlaylistMode).toBe(true);

      // Stop playback
      await simpleAudioService.stop();

      // Verify playlist mode is reset
      const playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(0);
    });
  });

  describe('playlist state management', () => {
    it('should maintain playlist state across operations', async () => {
      const tracks = [mockTrack1, mockTrack2, mockTrack3];
      await simpleAudioService.playPlaylist(tracks, jest.fn());

      // Check initial state
      let playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(true);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(3);

      // Stop and verify reset
      await simpleAudioService.stop();
      playlistInfo = simpleAudioService.getPlaylistInfo();
      expect(playlistInfo.isPlaylistMode).toBe(false);
      expect(playlistInfo.currentIndex).toBe(0);
      expect(playlistInfo.totalTracks).toBe(0);
    });
  });
});
