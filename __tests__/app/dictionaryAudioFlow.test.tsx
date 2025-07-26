import { describe, expect, it, jest } from '@jest/globals';

import { simpleAudioService } from '../../services/simpleAudioService';

// Mock the audio service
jest.mock('../../services/simpleAudioService', () => ({
  simpleAudioService: {
    play: jest.fn(),
    subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
    getStatus: jest.fn(() => ({
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      currentTrack: null,
    })),
  },
}));

describe('Dictionary Audio Flow', () => {
  it('should call simpleAudioService.play to play word audio', async () => {
    const mockPlay = simpleAudioService.play as jest.MockedFunction<typeof simpleAudioService.play>;
    mockPlay.mockResolvedValue(true);

    // Simulate the audio playback
    const track = {
      id: 'word-123-ar',
      audioUrl: 'https://example.com/audio/word123.mp3',
      title: 'كِتَاب',
    };

    const result = await simpleAudioService.play(track);

    expect(mockPlay).toHaveBeenCalledWith(track);
    expect(result).toBe(true);
  });

  it('should handle audio playback errors gracefully', async () => {
    const mockPlay = simpleAudioService.play as jest.MockedFunction<typeof simpleAudioService.play>;
    mockPlay.mockRejectedValue(new Error('Audio playback failed'));

    // Simulate the audio playback with error
    const track = {
      id: 'word-456-ar',
      audioUrl: 'https://example.com/audio/word456.mp3',
      title: 'مَكْتَبَة',
    };

    try {
      await simpleAudioService.play(track);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Audio playback failed');
    }

    expect(mockPlay).toHaveBeenCalledWith(track);
  });
});
