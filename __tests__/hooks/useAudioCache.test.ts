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

  it('calls clearCache on the service', async () => {
    (audioCache.clearCache as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.clearCache()).resolves.toBeUndefined();
    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
  });

  it('rethrows errors from clearCache', async () => {
    const err = new Error('fail');
    (audioCache.clearCache as jest.Mock).mockRejectedValueOnce(err);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.clearCache()).rejects.toThrow(err);
    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
  });

  it('returns cache size from the service', async () => {
    (audioCache.getCacheSize as jest.Mock).mockResolvedValueOnce(123);
    const { result } = renderHook(() => useAudioCache());

    await expect(result.current.getCacheSize()).resolves.toBe(123);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when getCacheSize throws', async () => {
    (audioCache.getCacheSize as jest.Mock).mockRejectedValueOnce(new Error('oops'));
    const { result } = renderHook(() => useAudioCache());

    const size = await result.current.getCacheSize();
    expect(size).toBe(0);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  it('handles concurrent clearCache and getCacheSize calls', async () => {
    (audioCache.clearCache as jest.Mock).mockResolvedValueOnce(undefined);
    (audioCache.getCacheSize as jest.Mock).mockResolvedValueOnce(42);

    const { result } = renderHook(() => useAudioCache());

    // Fire both at once
    const clearPromise = result.current.clearCache();
    const sizePromise = result.current.getCacheSize();

    await expect(clearPromise).resolves.toBeUndefined();
    await expect(sizePromise).resolves.toBe(42);

    expect(audioCache.clearCache).toHaveBeenCalledTimes(1);
    expect(audioCache.getCacheSize).toHaveBeenCalledTimes(1);
  });

  it('returns 0 if getCacheSize resolves to a non-number', async () => {
    (audioCache.getCacheSize as jest.Mock).mockResolvedValueOnce('not-a-number');
    const { result } = renderHook(() => useAudioCache());

    const size = await result.current.getCacheSize();
    expect(size).toBe(0);
  });

  it('returns 0 if getCacheSize resolves to null or undefined', async () => {
    (audioCache.getCacheSize as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAudioCache());
    expect(await result.current.getCacheSize()).toBe(0);

    (audioCache.getCacheSize as jest.Mock).mockResolvedValueOnce(undefined);
    expect(await result.current.getCacheSize()).toBe(0);
  });

  it('does not update state after unmount', async () => {
    let resolvePromise: (value: number) => void;
    const promise = new Promise<number>(resolve => {
      resolvePromise = resolve;
    });

    (audioCache.getCacheSize as jest.Mock).mockReturnValueOnce(promise);
    const { result, unmount } = renderHook(() => useAudioCache());

    const sizePromise = result.current.getCacheSize();
    unmount();

    // Resolve the promise after unmount
    resolvePromise!(99);

    // The promise should still resolve without causing issues
    await expect(sizePromise).resolves.toBe(99);
  });

  it('recovers from getCacheSize error on retry', async () => {
    (audioCache.getCacheSize as jest.Mock)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(77);

    const { result } = renderHook(() => useAudioCache());

    expect(await result.current.getCacheSize()).toBe(0); // first call fails
    expect(await result.current.getCacheSize()).toBe(77); // second call succeeds
  });
});
