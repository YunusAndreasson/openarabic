import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions } from '@/utils/navigation';

const renderCloseButton = () => <CloseButton />;
const HIDDEN_HEADER_OPTIONS = { headerShown: false } as const;

export default function AuthLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen name="index" options={HIDDEN_HEADER_OPTIONS} />
      <Stack.Screen
        name="sign-in"
        options={createNavigationOptions(colors, {
          title: STRINGS.SIGN_IN_TITLE,
          headerRight: renderCloseButton,
        })}
      />
      <Stack.Screen
        name="sign-up"
        options={createNavigationOptions(colors, {
          title: STRINGS.CREATE_ACCOUNT_TITLE,
          headerRight: renderCloseButton,
        })}
      />
      <Stack.Screen
        name="terms"
        options={createNavigationOptions(colors, {
          title: STRINGS.TERMS_OF_SERVICE,
          headerRight: renderCloseButton,
        })}
      />
      <Stack.Screen
        name="privacy"
        options={createNavigationOptions(colors, {
          title: STRINGS.PRIVACY_POLICY,
          headerRight: renderCloseButton,
        })}
      />
    </Stack>
  );
}
