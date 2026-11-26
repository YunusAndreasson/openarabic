import { router, Stack, useIsFocused, useNavigation } from 'expo-router';
import { useEffect, type JSX } from 'react';

import { CloseButton } from '@/components/ui/CloseButton';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCloseAuth } from '@/hooks/auth/useCloseAuth';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions } from '@/utils/navigation';

const HIDDEN_HEADER_OPTIONS = { headerShown: false } as const;

function AuthCloseButton() {
  const closeAuth = useCloseAuth();
  return <CloseButton onPress={closeAuth} />;
}

const renderAuthCloseButton = () => <AuthCloseButton />;

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

  const screenOptions = (title: string, headerBackVisible = false) =>
    createNavigationOptions(colors, {
      title,
      headerBackVisible,
      headerRight: renderAuthCloseButton,
      isRegularScreen: true,
    });

  return (
    <Stack>
      <Stack.Screen name="index" options={screenOptions(STRINGS.SIGN_IN_TITLE)} />
      <Stack.Screen name="sign-in" options={HIDDEN_HEADER_OPTIONS} />
      <Stack.Screen name="sign-up" options={HIDDEN_HEADER_OPTIONS} />
      <Stack.Screen name="terms" options={screenOptions(STRINGS.TERMS_OF_SERVICE, true)} />
      <Stack.Screen name="privacy" options={screenOptions(STRINGS.PRIVACY_POLICY, true)} />
    </Stack>
  );
}
