// Mock audio service with realistic behavior
const createMockSound = () => ({
  playAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  pauseAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  stopAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  unloadAsync: jest.fn().mockResolvedValue({ status: 'unloaded' }),
  setPositionAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  setRateAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  setVolumeAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
  getStatusAsync: jest.fn().mockResolvedValue({
    isLoaded: true,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 100000,
    rate: 1.0,
    volume: 1.0,
    isBuffering: false,
    didJustFinish: false,
  }),
  setOnPlaybackStatusUpdate: jest.fn(),
});

const mockCreateAsync = jest.fn().mockResolvedValue(createMockSound());
const mockSetAudioModeAsync = jest.fn().mockResolvedValue({});
const mockCreateAudioPlayer = jest.fn().mockResolvedValue(createMockSound());

module.exports = {
  __esModule: true,
  Audio: {
    Sound: {
      createAsync: mockCreateAsync,
    },
    setAudioModeAsync: mockSetAudioModeAsync,
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
  AudioPlayer: {
    create: mockCreateAudioPlayer,
  },
  InterruptionModeIOS: {
    MixWithOthers: 0,
    DoNotMix: 1,
    DuckOthers: 2,
  },
  InterruptionModeAndroid: {
    DoNotMix: 1,
    DuckOthers: 2,
  },
  // Expose mocks for test verification
  __mocks: {
    createAsync: mockCreateAsync,
    setAudioModeAsync: mockSetAudioModeAsync,
    createAudioPlayer: mockCreateAudioPlayer,
  },
};
