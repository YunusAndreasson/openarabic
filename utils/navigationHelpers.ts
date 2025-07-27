import { router } from 'expo-router';

import type { NowPlayingModalParams } from '@/types/navigation.types';

/**
 * Opens the now playing modal with optional parameters
 * @param params - Optional parameters for the modal
 */
export const openNowPlayingModal = (params?: NowPlayingModalParams) => {
  router.push({
    pathname: '/(tabs)/listen/now-playing',
    params,
  });
};
