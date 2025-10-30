// Unmock audioCache since this test file tests the real implementation
jest.unmock('@/services/audioCache');

const mockDownloadFileAsync = jest.fn();
const mockFileConstructor = jest.fn();
const mockDirectoryConstructor = jest.fn();
const mockDigestStringAsync = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockDirectoryDelete = jest.fn();
const mockDirectoryList = jest.fn();

jest.mock('expo-file-system', () => ({
  File: Object.assign(
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    })),
    {
      downloadFileAsync: mockDownloadFileAsync,
    },
  ),
  Directory: mockDirectoryConstructor.mockImplementation(path => ({
    uri: path,
    exists: true,
    create: mockDirectoryCreate,
    delete: mockDirectoryDelete,
    list: mockDirectoryList,
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
    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    // Reset mocks
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
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
    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    const FileSystemLegacy = require('expo-file-system/legacy');
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
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
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
    const { handleError } = require('../../utils/errorHandling');

    // Mock crypto to return the expected hash
    mockDigestStringAsync.mockResolvedValue(hash);

    // Clear mocks before test
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
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
    // Clear mocks
    mockDirectoryConstructor.mockClear();
    mockDirectoryCreate.mockClear();
    mockDirectoryDelete.mockClear();

    // Mock Directory to handle multiple calls
    // First call: constructor (ensureCacheDirectoryExists) - exists: false
    // Second call: clearCache - exists: true
    // Third call: ensureCacheDirectoryExists after delete - exists: false
    mockDirectoryConstructor
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // Constructor call
        create: mockDirectoryCreate,
        delete: mockDirectoryDelete,
        list: mockDirectoryList,
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: true, // clearCache call
        create: mockDirectoryCreate,
        delete: mockDirectoryDelete,
        list: mockDirectoryList,
      }))
      .mockImplementationOnce(path => ({
        uri: path,
        exists: false, // ensureCacheDirectoryExists after delete
        create: mockDirectoryCreate,
        delete: mockDirectoryDelete,
        list: mockDirectoryList,
      }));

    audioCache = require('../../services/audioCache').audioCache;

    await audioCache.clearCache();

    expect(mockDirectoryDelete).toHaveBeenCalled();
    expect(mockDirectoryCreate).toHaveBeenCalled();
  });

  test('clearCache rethrows errors from delete', async () => {
    const { handleError } = require('../../utils/errorHandling');
    const err = new Error('fail');

    // Clear mocks
    mockDirectoryConstructor.mockClear();
    mockDirectoryDelete.mockClear();

    mockDirectoryDelete.mockRejectedValueOnce(err);

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    await expect(audioCache.clearCache()).rejects.toThrow(err);
    expect(handleError).toHaveBeenCalledWith(err);
  });

  test('getCacheSize sums file sizes correctly', async () => {
    // Clear mocks
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDirectoryList.mockClear();

    // Mock directory.list() to return File instances
    mockDirectoryList.mockResolvedValue([
      {
        uri: '/cache/audio/one.mp3',
        exists: true,
        size: 100,
      },
      {
        uri: '/cache/audio/two.mp3',
        exists: true,
        size: 200,
      },
    ]);

    // Mock Directory to exist
    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(mockDirectoryList).toHaveBeenCalled();
    expect(size).toBe(300);
  });
});
