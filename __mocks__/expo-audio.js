const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = jest.fn().mockResolvedValue({});
const mockSetIsAudioActiveAsync = jest.fn().mockResolvedValue(undefined);
const mockPreload = jest.fn().mockResolvedValue(undefined);
const mockClearPreloadedSource = jest.fn().mockResolvedValue(undefined);
const mockClearAllPreloadedSources = jest.fn().mockResolvedValue(undefined);

module.exports = {
  __esModule: true,
  createAudioPlayer: mockCreateAudioPlayer,
  setAudioModeAsync: mockSetAudioModeAsync,
  setIsAudioActiveAsync: mockSetIsAudioActiveAsync,
  preload: mockPreload,
  clearPreloadedSource: mockClearPreloadedSource,
  clearAllPreloadedSources: mockClearAllPreloadedSources,
  // Expose mocks for test verification
  __mocks: {
    createAudioPlayer: mockCreateAudioPlayer,
    setAudioModeAsync: mockSetAudioModeAsync,
    setIsAudioActiveAsync: mockSetIsAudioActiveAsync,
    preload: mockPreload,
    clearPreloadedSource: mockClearPreloadedSource,
    clearAllPreloadedSources: mockClearAllPreloadedSources,
  },
};
