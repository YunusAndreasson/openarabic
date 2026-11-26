import { router, useNavigation } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';

export function useCloseAuth() {
  const screen = useNavigation();
  const root = useNavigation('/');

  return () => {
    // A native provider can report cancellation after the modal has closed.
    if (!screen.isFocused()) return;
    if (root.canGoBack()) root.goBack();
    else router.replace(ROUTE_PATHS.EXPLORE_TAB);
  };
}
