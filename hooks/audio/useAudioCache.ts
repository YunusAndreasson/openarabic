import { useCallback, useMemo } from 'react';

import { STRINGS } from '@/constants/strings';
import { audioCache } from '@/services/audioCache';
import { withErrorHandling, withErrorHandlingDefault } from '@/utils/errorHandling';

/**
 * Hook for accessing audio cache functionality
 */
export function useAudioCache() {
  const clearCache = useCallback(
    withErrorHandling(() => audioCache.clearCache(), {
      toastMessage: STRINGS.FAILED_TO_CLEAR_AUDIO_CACHE,
    }),
    [],
  );

  const getCacheSize = useCallback(
    withErrorHandlingDefault(
      async () => {
        const size = await audioCache.getCacheSize();
        // Ensure we always return a valid number, default to 0 for invalid values
        return typeof size === 'number' && !isNaN(size) && size >= 0 ? size : 0;
      },
      0,
      { toastMessage: STRINGS.FAILED_TO_GET_CACHE_SIZE },
    ),
    [],
  );

  const cacheAPI = useMemo(() => ({ clearCache, getCacheSize }), [clearCache, getCacheSize]);

  return cacheAPI;
}
