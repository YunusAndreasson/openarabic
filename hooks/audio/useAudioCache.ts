import { useCallback } from 'react';

import { audioCache } from '@/services/audioCache';
import { handleError } from '@/utils/errorHandling';

/**
 * Hook for accessing audio cache functionality
 */
export function useAudioCache() {
  const clearCache = useCallback(async () => {
    try {
      await audioCache.clearCache();
    } catch (error) {
      await handleError(error as Error, { toastMessage: 'Failed to clear audio cache' });
      throw error;
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    try {
      return await audioCache.getCacheSize();
    } catch (error) {
      await handleError(error as Error, { toastMessage: 'Failed to get cache size' });
      return 0;
    }
  }, []);

  return {
    clearCache,
    getCacheSize,
  };
}
