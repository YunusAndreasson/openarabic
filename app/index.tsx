import { router } from 'expo-router';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';

/**
 * Index screen - redirects to explore tab
 *
 * Uses InteractionManager to defer redirect and prevent Android ViewGroup
 * NullPointerException race condition where Android tries to render a view
 * hierarchy that React Native has already unmounted during redirect.
 */
export default function Index(): JSX.Element | null {
  useEffect(() => {
    // Defer redirect until after initial render and interactions complete
    // This prevents Android ViewGroup crash when view hierarchy is modified
    // during Android's rendering pass
    const interaction = InteractionManager.runAfterInteractions(() => {
      router.replace(ROUTE_PATHS.EXPLORE_TAB);
    });

    return () => {
      interaction.cancel();
    };
  }, []);

  // Return null to avoid rendering anything that could cause view hierarchy issues
  return null;
}
