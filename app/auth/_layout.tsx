import { router, Stack, useIsFocused, useNavigation } from 'expo-router';
import { useEffect, type JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions, renderCloseButton } from '@/utils/navigation';

export const unstable_settings = { anchor: 'index' };

const HIDDEN_HEADER_OPTIONS = { headerShown: false } as const;

export default function AuthLayout(): JSX.Element {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || !isAuthenticated) return;
    // The layout belongs to the root stack. Pop the auth group as one screen
    // so navigating within its nested forms never resets the tab or reader.
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace(ROUTE_PATHS.EXPLORE_TAB);
  }, [focused, isAuthenticated, navigation]);

  // The root presents the auth group modally. Its own screens can be the
  // first in their stack, including when an external link targets one.
  const screenOptions = (title: string) =>
    createNavigationOptions(colors, {
      title,
      headerBackVisible: false,
      headerRight: renderCloseButton,
      isRegularScreen: true,
    });

  return (
    <Stack>
      <Stack.Screen name="index" options={HIDDEN_HEADER_OPTIONS} />
      <Stack.Screen name="sign-in" options={screenOptions(STRINGS.SIGN_IN_TITLE)} />
      <Stack.Screen name="sign-up" options={screenOptions(STRINGS.CREATE_ACCOUNT_TITLE)} />
      <Stack.Screen name="terms" options={screenOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={screenOptions(STRINGS.PRIVACY_POLICY)} />
    </Stack>
  );
}
