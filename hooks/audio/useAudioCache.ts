import { useCallback, useMemo } from 'react';

import { STRINGS } from '@/constants/strings';
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
      await handleError(error as Error, { toastMessage: STRINGS.FAILED_TO_CLEAR_AUDIO_CACHE });
      throw error;
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    try {
      const size = await audioCache.getCacheSize();
      // Ensure we always return a valid number, default to 0 for invalid values
      return typeof size === 'number' && !isNaN(size) && size >= 0 ? size : 0;
    } catch (error) {
      await handleError(error as Error, { toastMessage: STRINGS.FAILED_TO_GET_CACHE_SIZE });
      return 0;
    }
  }, []);

  const cacheAPI = useMemo(() => ({ clearCache, getCacheSize }), [clearCache, getCacheSize]);

  return cacheAPI;
}
