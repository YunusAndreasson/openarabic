import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions, renderCloseButton } from '@/utils/navigation';

const HIDDEN_HEADER_OPTIONS = { headerShown: false } as const;

export default function AuthLayout(): JSX.Element {
  const colors = useColors();

  // Everything past the landing screen is a modal with the same close button;
  // only the title differs.
  const modalOptions = (title: string) =>
    createNavigationOptions(colors, { title, headerRight: renderCloseButton });

  return (
    <Stack>
      <Stack.Screen name="index" options={HIDDEN_HEADER_OPTIONS} />
      <Stack.Screen name="sign-in" options={modalOptions(STRINGS.SIGN_IN_TITLE)} />
      <Stack.Screen name="sign-up" options={modalOptions(STRINGS.CREATE_ACCOUNT_TITLE)} />
      <Stack.Screen name="terms" options={modalOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={modalOptions(STRINGS.PRIVACY_POLICY)} />
    </Stack>
  );
}
