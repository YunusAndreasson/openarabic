import { router } from 'expo-router';

import type { NowPlayingModalParams } from '@/types/navigation.types';

/**
 * Opens the independent NowPlaying modal from any screen
 * @param params Optional parameters to pass to the modal
 */
export const openNowPlayingModal = (params?: NowPlayingModalParams) => {
  router.push({
    pathname: '/NowPlaying',
    params,
  });
};

/**
 * Closes the NowPlaying modal
 */
export const closeNowPlayingModal = () => {
  router.dismiss();
};
