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
});
