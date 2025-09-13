const mockDownloadFileAsync = jest.fn();
const mockFileConstructor = jest.fn();
const mockDirectoryConstructor = jest.fn();
const mockDigestStringAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  File: Object.assign(
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    })),
    {
      downloadFileAsync: mockDownloadFileAsync,
    }
  ),
  Directory: mockDirectoryConstructor.mockImplementation(path => ({
    uri: path,
    exists: true,
  })),
  Paths: {
    cache: {
      uri: '/cache/',
    },
  },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { MD5: 'MD5' },
  digestStringAsync: mockDigestStringAsync,
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

let audioCache: any;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('audioCache', () => {
  const url = 'http://example.com/test.mp3';
  const hash = 'abc123';
  const cachedPath = `/cache/audio/${hash}.mp3`;

  test('getAudio returns cached file path when it exists', async () => {
    const FileSystem = require('expo-file-system');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Reset mocks
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock File to exist (cached file found)
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    const result = await audioCache.getAudio(url);

    expect(result).toBe(cachedPath);
  });

  test('getAudio downloads file when not cached', async () => {
    const FileSystem = require('expo-file-system');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true }) // constructor check
      .mockResolvedValueOnce({ exists: true }); // cache dir exists during download

    // Clear mocks before test
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock File to not exist initially (triggers download)
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      size: null,
    }));

    // Mock the download to return a successful result
    mockDownloadFileAsync.mockResolvedValue({ uri: cachedPath, exists: true });

    audioCache = require('../../services/audioCache').audioCache;

    const result = await audioCache.getAudio(url);

    expect(mockDownloadFileAsync).toHaveBeenCalled();
    expect(result).toBe(cachedPath);
  });

  test('getAudio returns original URL on failed download', async () => {
    const FileSystem = require('expo-file-system');
    const { handleError } = require('../../utils/errorHandling');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks before test
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock File to not exist (triggers download)
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      size: null,
    }));

    // Mock the download to fail
    mockDownloadFileAsync.mockResolvedValue({ uri: cachedPath, exists: false });

    audioCache = require('../../services/audioCache').audioCache;

    const result = await audioCache.getAudio(url);

    expect(result).toBe(url);
    expect(handleError).toHaveBeenCalled();
  });

  test('clearCache removes files and recreates directory', async () => {
    const FileSystem = require('expo-file-system');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();

    audioCache = require('../../services/audioCache').audioCache;

    await audioCache.clearCache();

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('/cache/audio/');
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('/cache/audio/', {
      intermediates: true,
    });
  });

  test('clearCache rethrows errors from deleteAsync', async () => {
    const FileSystem = require('expo-file-system');
    const { handleError } = require('../../utils/errorHandling');
    const err = new Error('fail');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    (FileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(err);
    audioCache = require('../../services/audioCache').audioCache;

    await expect(audioCache.clearCache()).rejects.toThrow(err);
    expect(handleError).toHaveBeenCalledWith(err);
  });

  test('getCacheSize sums file sizes correctly', async () => {
    const FileSystem = require('expo-file-system');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock File instances with sizes
    mockFileConstructor.mockImplementationOnce(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));
    mockFileConstructor.mockImplementationOnce(path => ({
      uri: path,
      exists: true,
      size: 200,
    }));

    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['one.mp3', 'two.mp3']);
    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(size).toBe(300);
  });
});
