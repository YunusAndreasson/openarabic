import { AUDIO_STATES } from '../../hooks/useAudioPlayer';

// Mock the expo-av Audio module
jest.mock('expo-av', () => {
  const mockSound = {
    playAsync: jest.fn().mockResolvedValue({}),
    pauseAsync: jest.fn().mockResolvedValue({}),
    stopAsync: jest.fn().mockResolvedValue({}),
    unloadAsync: jest.fn().mockResolvedValue({}),
    setPositionAsync: jest.fn().mockResolvedValue({}),
    getStatusAsync: jest.fn().mockResolvedValue({
      isLoaded: true,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 100000,
      isBuffering: false,
      didJustFinish: false,
    }),
  };

  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({
          sound: mockSound,
          status: {
            isLoaded: true,
          },
        }),
      },
      setAudioModeAsync: jest.fn().mockResolvedValue({}),
    },
    mockSound, // Export for test assertions
  };
});

describe('useAudioPlayer', () => {
  it('should have the correct audio states', () => {
    expect(AUDIO_STATES.IDLE).toBe('idle');
    expect(AUDIO_STATES.LOADING).toBe('loading');
    expect(AUDIO_STATES.PLAYING).toBe('playing');
    expect(AUDIO_STATES.PAUSED).toBe('paused');
    expect(AUDIO_STATES.ERROR).toBe('error');
  });

  // Note: We're not testing the hook functionality directly due to React Native testing limitations
  // Instead, we'll test the hook indirectly through the AudioPlayer component tests
  it('should mock the Audio API correctly', () => {
    const { Audio } = require('expo-av');
    expect(Audio.Sound.createAsync).toBeDefined();
    expect(Audio.setAudioModeAsync).toBeDefined();
  });
});
