const mockDownloadFileAsync = jest.fn();
const mockFileConstructor = jest.fn();
const mockDirectoryConstructor = jest.fn();
const mockDigestStringAsync = jest.fn();

jest.mock('expo-file-system', () => ({
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

jest.mock('expo-file-system/legacy', () => ({
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
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
    const FileSystemLegacy = require('expo-file-system/legacy');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystemLegacy.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

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
    const FileSystemLegacy = require('expo-file-system/legacy');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystemLegacy.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true }) // constructor check
      .mockResolvedValueOnce({ exists: true }); // cache dir exists during download

    // Clear mocks before test
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    // Mock Directory to exist for ensureCacheDirectoryExists
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock File to not exist initially (triggers download)
    // First call: getCachedFilePath - file doesn't exist
    // Second call: cacheAudio - file doesn't exist initially
    mockFileConstructor
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // getCachedFilePath - file not found
        size: null,
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // cacheAudio - file doesn't exist initially
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
    const FileSystemLegacy = require('expo-file-system/legacy');
    const { handleError } = require('../../utils/errorHandling');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    (FileSystemLegacy.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

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
    // First call: getCachedFilePath - file doesn't exist
    // Second call: cacheAudio - file doesn't exist initially
    mockFileConstructor
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // getCachedFilePath - file not found
        size: null,
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // cacheAudio - file doesn't exist initially
        size: null,
      }));

    // Mock the download to fail
    mockDownloadFileAsync.mockRejectedValue(new Error('Download failed'));

    audioCache = require('../../services/audioCache').audioCache;

    const result = await audioCache.getAudio(url);

    expect(result).toBe(url);
    expect(handleError).toHaveBeenCalled();
  });

  test('clearCache removes files and recreates directory', async () => {
    const FileSystemLegacy = require('expo-file-system/legacy');
    (FileSystemLegacy.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();
    (FileSystemLegacy.deleteAsync as jest.Mock).mockClear();
    (FileSystemLegacy.makeDirectoryAsync as jest.Mock).mockClear();

    // Mock Directory to handle multiple calls
    // First call: constructor (ensureCacheDirectoryExists) - exists: false
    // Second call: clearCache - exists: true
    // Third call: ensureCacheDirectoryExists after delete - exists: false
    mockDirectoryConstructor
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // Constructor call
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: true, // clearCache call
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // ensureCacheDirectoryExists after delete
      }));

    audioCache = require('../../services/audioCache').audioCache;

    await audioCache.clearCache();

    expect(FileSystemLegacy.deleteAsync).toHaveBeenCalledWith('/cache/audio/');
    expect(FileSystemLegacy.makeDirectoryAsync).toHaveBeenCalledWith('/cache/audio/', {
      intermediates: true,
    });
  });

  test('clearCache rethrows errors from deleteAsync', async () => {
    const FileSystemLegacy = require('expo-file-system/legacy');
    const { handleError } = require('../../utils/errorHandling');
    const err = new Error('fail');
    (FileSystemLegacy.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    (FileSystemLegacy.deleteAsync as jest.Mock).mockRejectedValueOnce(err);
    audioCache = require('../../services/audioCache').audioCache;

    await expect(audioCache.clearCache()).rejects.toThrow(err);
    expect(handleError).toHaveBeenCalledWith(err);
  });

  test('getCacheSize sums file sizes correctly', async () => {
    const FileSystemLegacy = require('expo-file-system/legacy');
    (FileSystemLegacy.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // constructor check

    // Clear mocks
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
    }));

    // Mock legacy readDirectoryAsync to return file names
    (FileSystemLegacy.readDirectoryAsync as jest.Mock).mockResolvedValue(['one.mp3', 'two.mp3']);

    // Mock File instances with sizes
    mockFileConstructor
      .mockImplementationOnce(path => ({
        uri: path,
        exists: true,
        size: 100,
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: true,
        size: 200,
      }));

    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(size).toBe(300);
  });
});
