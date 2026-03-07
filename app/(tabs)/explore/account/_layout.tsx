import { Stack } from 'expo-router';

import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
  const colors = useColors();

  const screenOptions = (title: string) =>
    createNavigationOptions(colors, {
      title,
      headerRight: () => <CloseButton />,
    });

  return (
    <Stack>
      <Stack.Screen name="index" options={screenOptions(STRINGS.ACCOUNT)} />
      <Stack.Screen name="FontSelector" options={screenOptions(STRINGS.ARABIC_FONT)} />
      <Stack.Screen name="DeleteAccount" options={screenOptions(STRINGS.DELETE_ACCOUNT)} />
      <Stack.Screen name="help" options={screenOptions(STRINGS.HELP_CENTER)} />
      <Stack.Screen name="feedback" options={screenOptions(STRINGS.CONTACT_SUPPORT)} />
      <Stack.Screen name="terms" options={screenOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={screenOptions(STRINGS.PRIVACY_POLICY)} />
      <Stack.Screen name="legal" options={screenOptions(STRINGS.LEGAL_ATTRIBUTIONS)} />
    </Stack>
  );
}
