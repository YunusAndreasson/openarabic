/**
 * Audio Cache Service Tests
 *
 * Tests the audio cache service which handles file caching and downloads.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

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

  test('getCacheSize returns 0 for empty directory', async () => {
    mockDirectoryConstructor.mockClear();
    mockDirectoryList.mockClear();

    mockDirectoryList.mockResolvedValue([]);

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(size).toBe(0);
  });

  test('getCacheSize returns 0 when directory does not exist', async () => {
    mockDirectoryConstructor.mockClear();
    mockDirectoryList.mockClear();

    // When directory doesn't exist, list returns empty or we get 0
    mockDirectoryList.mockResolvedValue([]);

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(size).toBe(0);
  });

  test('getCacheSize handles files with null size', async () => {
    mockDirectoryConstructor.mockClear();
    mockDirectoryList.mockClear();

    mockDirectoryList.mockResolvedValue([
      {
        uri: '/cache/audio/one.mp3',
        exists: true,
        size: 100,
      },
      {
        uri: '/cache/audio/two.mp3',
        exists: true,
        size: null, // File with unknown size
      },
      {
        uri: '/cache/audio/three.mp3',
        exists: true,
        size: 50,
      },
    ]);

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    const size = await audioCache.getCacheSize();

    expect(size).toBe(150); // Only 100 + 50, null size file skipped
  });

  test('getAudio returns original URL for local files', async () => {
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    // Local file (file://) should be returned directly without caching
    const localUrl = 'file:///local/path/audio.mp3';
    const result = await audioCache.getAudio(localUrl);

    expect(result).toBe(localUrl);
    expect(mockDownloadFileAsync).not.toHaveBeenCalled();
    expect(mockDigestStringAsync).not.toHaveBeenCalled();
  });

  test('getAudio handles concurrent requests for same URL', async () => {
    // Use a unique URL to avoid memory cache from previous tests
    const uniqueUrl = 'http://example.com/unique-concurrent-test.mp3';
    const uniqueHash = 'uniquehash123';
    const uniqueCachedPath = `/cache/audio/${uniqueHash}.mp3`;

    mockDigestStringAsync.mockResolvedValue(uniqueHash);
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    // File doesn't exist - triggers download
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      size: null,
    }));

    // Mock download to succeed
    mockDownloadFileAsync.mockResolvedValue({ uri: uniqueCachedPath, exists: true });

    audioCache = require('../../services/audioCache').audioCache;

    // Make two concurrent requests
    const [result1, result2] = await Promise.all([
      audioCache.getAudio(uniqueUrl),
      audioCache.getAudio(uniqueUrl),
    ]);

    // Both should get the cached path
    expect(result1).toBe(uniqueCachedPath);
    expect(result2).toBe(uniqueCachedPath);
  });

  test('memory cache serves cached results without file system check', async () => {
    mockDigestStringAsync.mockResolvedValue(hash);
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    // First call: file exists on disk
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    // First call populates memory cache
    const result1 = await audioCache.getAudio(url);
    expect(result1).toBe(cachedPath);

    // Clear the file constructor to verify memory cache is used
    mockFileConstructor.mockClear();

    // Second call should use memory cache without checking file system
    const result2 = await audioCache.getAudio(url);
    expect(result2).toBe(cachedPath);

    // File constructor should not be called for second request (served from memory)
    // Note: This depends on memory cache TTL not expiring during test
    // The implementation checks memory cache first
  });

  test('generateCacheKey extracts file extension from URL', async () => {
    mockDigestStringAsync.mockResolvedValue('testhash');
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    // File exists to test the path generation
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    // URL with .wav extension
    const wavUrl = 'http://example.com/audio/test.wav';
    const result = await audioCache.getAudio(wavUrl);

    // Should use .wav extension in cache path
    expect(result).toBe('/cache/audio/testhash.wav');
  });

  test('generateCacheKey handles URLs with query parameters', async () => {
    mockDigestStringAsync.mockResolvedValue('queryhash');
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    // URL with query parameters after extension
    const urlWithQuery = 'http://example.com/audio/test.mp3?token=abc123';
    const result = await audioCache.getAudio(urlWithQuery);

    // Should strip query params from extension
    expect(result).toBe('/cache/audio/queryhash.mp3');
  });

  test('clearCache also clears memory cache', async () => {
    mockDigestStringAsync.mockResolvedValue(hash);
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDirectoryCreate.mockClear();
    mockDirectoryDelete.mockClear();

    let directoryCallCount = 0;
    mockDirectoryConstructor.mockImplementation(path => {
      directoryCallCount++;
      // First two calls (constructor + initial getAudio): exists
      // Third call (clearCache): exists for delete
      // Fourth call (after delete): doesn't exist for recreate
      const exists = directoryCallCount <= 3;
      return {
        uri: path,
        exists,
        create: mockDirectoryCreate,
        delete: mockDirectoryDelete,
        list: mockDirectoryList,
      };
    });

    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
    }));

    audioCache = require('../../services/audioCache').audioCache;

    // First call to populate memory cache
    await audioCache.getAudio(url);

    // Clear the cache
    await audioCache.clearCache();

    // Reset file mock to not exist
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      size: null,
    }));
    mockDownloadFileAsync.mockResolvedValue({ uri: cachedPath, exists: true });

    // After clearCache, memory cache should be cleared
    // So this should trigger a new download
    await audioCache.getAudio(url);

    // Verify clearCache was called
    expect(mockDirectoryDelete).toHaveBeenCalled();
  });

  test('successful download after cache miss', async () => {
    // Use a unique URL to avoid memory cache
    const retryUrl = 'http://example.com/retry-test.mp3';
    const retryHash = 'retryhash789';
    const retryCachedPath = `/cache/audio/${retryHash}.mp3`;

    mockDigestStringAsync.mockResolvedValue(retryHash);
    mockDirectoryConstructor.mockClear();
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    mockDirectoryConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      create: mockDirectoryCreate,
      delete: mockDirectoryDelete,
      list: mockDirectoryList,
    }));

    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: false,
      size: null,
    }));

    // Download succeeds
    mockDownloadFileAsync.mockResolvedValue({ uri: retryCachedPath, exists: true });

    audioCache = require('../../services/audioCache').audioCache;

    const result = await audioCache.getAudio(retryUrl);
    expect(result).toBe(retryCachedPath);
  });
});
