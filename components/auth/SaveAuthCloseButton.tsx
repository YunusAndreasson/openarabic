import { router, useNavigation } from 'expo-router';

import { CloseButton } from '@/components/ui/CloseButton';
import { ROUTE_PATHS } from '@/constants/routes';

/** Close the auth modal and expose the word save that opened it. */
export function SaveAuthCloseButton() {
  const navigation = useNavigation('/');

  function closeAuth() {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace(ROUTE_PATHS.EXPLORE_TAB);
  }

  return <CloseButton onPress={closeAuth} />;
}
