// Mock for expo-av module
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

const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: mockSound,
      status: {
        isLoaded: true,
      },
    }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue({}),
};

export { Audio, mockSound };
