// `createAudioPlayer` is bare: each suite builds the player it needs.
const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = mockStable(() => Promise.resolve({}));
const mockSetIsAudioActiveAsync = mockStable(() => Promise.resolve(undefined));
const mockPreload = mockStable(() => Promise.resolve(undefined));
const mockClearPreloadedSource = mockStable(() => Promise.resolve(undefined));
const mockClearAllPreloadedSources = mockStable(() => Promise.resolve(undefined));

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
