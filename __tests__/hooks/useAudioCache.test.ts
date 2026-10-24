/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, beforeEach } from '@jest/globals';

import { useAudioCache } from '../../hooks/audio/useAudioCache';

jest.mock('../../services/audioCache', () => ({
  audioCache: {
    clearCache: jest.fn(),
    getCacheSize: jest.fn(),
  },
}));

const { audioCache } = require('../../services/audioCache');

describe('useAudioCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls clearCache on the service', async () => {
    (audioCache.clearCache as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.clearCache()).resolves.toBeUndefined();
    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
  });

  test('rethrows errors from clearCache', async () => {
    const err = new Error('fail');
    (audioCache.clearCache as jest.Mock).mockRejectedValueOnce(err);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.clearCache()).rejects.toThrow(err);
    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
  });

  test('returns cache size from the service', async () => {
    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(123);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.getCacheSize()).resolves.toBe(123);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  test('returns 0 when getCacheSize throws', async () => {
    (audioCache.getCacheSize as jest.Mock).mockImplementationOnce(() => {
      throw new Error('oops');
    });
    const { result } = renderHook(() => useAudioCache());

    const size = await result.current.getCacheSize();
    expect(size).toBe(0);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  test('handles concurrent clearCache and getCacheSize calls', async () => {
    (audioCache.clearCache as jest.Mock).mockResolvedValueOnce(undefined);
    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(42);

    const { result } = renderHook(() => useAudioCache());

    // Fire both at once
    const clearPromise = result.current.clearCache();
    const sizePromise = result.current.getCacheSize();

    await expect(clearPromise).resolves.toBeUndefined();
    await expect(sizePromise).resolves.toBe(42);

    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  test('returns 0 if getCacheSize returns a non-number', async () => {
    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce('not-a-number');
    const { result } = renderHook(() => useAudioCache());

    const size = await result.current.getCacheSize();
    expect(size).toBe(0);
  });

  test('returns 0 if getCacheSize returns null or undefined', async () => {
    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(null);
    const { result } = renderHook(() => useAudioCache());
    expect(await result.current.getCacheSize()).toBe(0);

    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(undefined);
    expect(await result.current.getCacheSize()).toBe(0);
  });

  test('still resolves when the screen unmounts before reading it', async () => {
    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(99);
    const { result, unmount } = renderHook(() => useAudioCache());

    const sizePromise = result.current.getCacheSize();
    unmount();

    await expect(sizePromise).resolves.toBe(99);
  });

  test('recovers from getCacheSize error on retry', async () => {
    (audioCache.getCacheSize as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('fail');
      })
      .mockReturnValueOnce(77);

    const { result } = renderHook(() => useAudioCache());

    expect(await result.current.getCacheSize()).toBe(0); // first call fails
    expect(await result.current.getCacheSize()).toBe(77); // second call succeeds
  });
});
