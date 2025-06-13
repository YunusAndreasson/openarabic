import { useCallback } from 'react';

import { audioCache } from '@/services/audioCache';

/**
 * Hook for accessing audio cache functionality
 */
export function useAudioCache() {
  const clearCache = useCallback(async () => {
    try {
      await audioCache.clearCache();
    } catch (error) {
      console.error('Failed to clear audio cache:', error);
      throw error;
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    try {
      return await audioCache.getCacheSize();
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }, []);

  return {
    clearCache,
    getCacheSize,
  };
}
