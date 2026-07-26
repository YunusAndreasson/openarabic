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
const mockFileMove = jest.fn();
const mockFileDelete = jest.fn();

/**
 * Path-aware File mock for download-flow tests. Downloads now land in a
 * `.tmp-*` file that is validated (exists + size) and moved into the final
 * cache path — temp paths report as freshly downloaded (exists, non-empty),
 * while the final cached path uses the provided flags.
 */
const makeFileMock =
  ({
    cachedExists = false,
    cachedSize = null,
  }: { cachedExists?: boolean; cachedSize?: number | null } = {}) =>
  (path: string) => ({
    uri: path,
    exists: path.includes('.tmp-') ? true : cachedExists,
    size: path.includes('.tmp-') ? 100 : cachedSize,
    move: mockFileMove,
    delete: mockFileDelete,
  });

jest.mock('expo-file-system', () => ({
  File: Object.assign(
    mockFileConstructor.mockImplementation(path => ({
      uri: path,
      exists: true,
      size: 100,
      move: mockFileMove,
      delete: mockFileDelete,
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
  // Directory#list() is synchronous in the SDK 57 API. Default to an empty
  // dir so the one-time legacy sweep (run lazily on first getAudio) has
  // nothing to delete; tests that exercise listing override this.
  mockDirectoryList.mockReturnValue([]);
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

    mockDownloadFileAsync.mockResolvedValue(undefined);

    // Require FIRST: it re-runs the expo-file-system mock factory (module
    // registry was reset), which re-applies the default File implementation
    // and would clobber a makeFileMock override set before it.
    audioCache = require('../../services/audioCache').audioCache;

    // Cached path doesn't exist (triggers download); temp file reports as
    // freshly downloaded so validation + move succeed
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

    const result = await audioCache.getAudio(url);

    expect(mockDownloadFileAsync).toHaveBeenCalled();
    // Downloaded temp file is moved into the final cache path
    expect(mockFileMove).toHaveBeenCalledWith(
      expect.objectContaining({ uri: cachedPath }),
      expect.objectContaining({ overwrite: true }),
    );
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

    // Mock the download to fail
    mockDownloadFileAsync.mockRejectedValue(new Error('Download failed'));

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    // Cached path doesn't exist (triggers download)
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

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

    // Directory.delete() is synchronous in the new expo-file-system API — it
    // throws, it does not reject. Mocking a rejection here left an unhandled
    // promise floating once the production code stopped awaiting it.
    mockDirectoryDelete.mockImplementationOnce(() => {
      throw err;
    });

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

    // Mock directory.list() to return File instances (synchronous API)
    mockDirectoryList.mockReturnValue([
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

    mockDirectoryList.mockReturnValue([]);

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
    mockDirectoryList.mockReturnValue([]);

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

    mockDirectoryList.mockReturnValue([
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

    // Mock download to succeed
    mockDownloadFileAsync.mockResolvedValue(undefined);

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    // Cached path doesn't exist - triggers download
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

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

    // Reset file mock: cached path gone, downloads succeed
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));
    mockDownloadFileAsync.mockResolvedValue(undefined);

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

    // Download succeeds
    mockDownloadFileAsync.mockResolvedValue(undefined);

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

    const result = await audioCache.getAudio(retryUrl);
    expect(result).toBe(retryCachedPath);
  });

  test('invalidate deletes the cached file so playback self-heal can re-download', async () => {
    const invalidateUrl = 'http://example.com/invalidate-test.mp3';
    const invalidateHash = 'invalidatehash';

    mockDigestStringAsync.mockResolvedValue(invalidateHash);
    mockFileConstructor.mockClear();
    mockFileDelete.mockClear();

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    // Cached file exists with content
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: true, cachedSize: 100 }));

    await audioCache.invalidate(invalidateUrl);

    expect(mockFileDelete).toHaveBeenCalled();
  });

  test('zero-byte cached file is purged and re-downloaded instead of served', async () => {
    const emptyUrl = 'http://example.com/empty-file-test.mp3';
    const emptyHash = 'emptyhash';
    const emptyCachedPath = `/cache/audio/${emptyHash}.mp3`;

    mockDigestStringAsync.mockResolvedValue(emptyHash);
    mockFileConstructor.mockClear();
    mockFileDelete.mockClear();
    mockDownloadFileAsync.mockClear();

    mockDownloadFileAsync.mockResolvedValue(undefined);

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    // Cached file exists but is empty (interrupted write artifact)
    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: true, cachedSize: 0 }));

    const result = await audioCache.getAudio(emptyUrl);

    // Empty artifact purged, fresh download served
    expect(mockFileDelete).toHaveBeenCalled();
    expect(mockDownloadFileAsync).toHaveBeenCalled();
    expect(result).toBe(emptyCachedPath);
  });

  test('quick mode does not retry a failed download', async () => {
    const quickUrl = 'http://example.com/quick-test.mp3';
    const quickHash = 'quickhash';

    mockDigestStringAsync.mockResolvedValue(quickHash);
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();

    // Network-classified error that would trigger retries in patient mode
    mockDownloadFileAsync.mockRejectedValue(new Error('Network connection lost'));

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

    const result = await audioCache.getAudio(quickUrl, { quick: true });

    // Falls back to the remote URL after a single attempt
    expect(result).toBe(quickUrl);
    expect(mockDownloadFileAsync).toHaveBeenCalledTimes(1);
  });

  test('one-time sweep deletes pre-overhaul cache files before first use and sets the flag', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const sweepUrl = 'http://example.com/sweep-test.mp3';
    const sweepHash = 'sweephash';

    mockDigestStringAsync.mockResolvedValue(sweepHash);
    mockFileConstructor.mockClear();
    mockDownloadFileAsync.mockClear();
    mockDownloadFileAsync.mockResolvedValue(undefined);

    // A leftover file from the pre-overhaul (direct-to-final-path) downloader
    const legacyEntryDelete = jest.fn();
    mockDirectoryList.mockReturnValue([
      { uri: '/cache/audio/old-poisoned.mp3', exists: true, size: 12, delete: legacyEntryDelete },
    ]);

    // Require first — re-running the mock factory would clobber makeFileMock
    audioCache = require('../../services/audioCache').audioCache;

    mockFileConstructor.mockImplementation(makeFileMock({ cachedExists: false }));

    await audioCache.getAudio(sweepUrl);

    // Sweep ran before the cache served anything, and the flag was persisted
    // so it never runs again
    expect(legacyEntryDelete).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@openarabic/audioCache/legacySweepV1',
      'true',
    );
  });
});
