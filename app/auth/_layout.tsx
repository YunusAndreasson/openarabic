import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions } from '@/utils/navigation';

export default function AuthLayout(): JSX.Element {
  const colors = useColors();

  const closeButton = () => <CloseButton />;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="sign-in"
        options={createNavigationOptions(colors, {
          title: STRINGS.SIGN_IN_TITLE,
          headerRight: closeButton,
        })}
      />
      <Stack.Screen
        name="sign-up"
        options={createNavigationOptions(colors, {
          title: STRINGS.CREATE_ACCOUNT_TITLE,
          headerRight: closeButton,
        })}
      />
      <Stack.Screen
        name="terms"
        options={createNavigationOptions(colors, {
          title: STRINGS.TERMS_OF_SERVICE,
          headerRight: () => <CloseButton />,
        })}
      />
      <Stack.Screen
        name="privacy"
        options={createNavigationOptions(colors, {
          title: STRINGS.PRIVACY_POLICY,
          headerRight: () => <CloseButton />,
        })}
      />
    </Stack>
  );
}
