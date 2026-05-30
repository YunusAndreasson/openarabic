import { Stack } from 'expo-router';

import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
  const colors = useColors();

  // The account route is mounted as a modal from explore (_layout.tsx); the
  // index screen inherits that modal presentation as the stack root. Sub-screens
  // (FontSelector, Help, Terms, Privacy, Legal, Delete account, Contact support)
  // push as regular stack pages inside the modal so they slide from the right
  // rather than stacking modal-on-modal — cleaner navigation chain on both
  // platforms. Setting isRegularScreen on the index itself is a no-op (the root
  // can't override the parent's presentation), but keeping the helper uniform
  // makes the layout easier to read.
  const screenOptions = (title: string) =>
    createNavigationOptions(colors, {
      title,
      headerRight: () => <CloseButton />,
      isRegularScreen: true,
    });

  return (
    <Stack>
      <Stack.Screen name="index" options={screenOptions(STRINGS.ACCOUNT)} />
      <Stack.Screen name="FontSelector" options={screenOptions(STRINGS.ARABIC_FONT)} />
      <Stack.Screen name="DeleteAccount" options={screenOptions(STRINGS.DELETE_ACCOUNT)} />
      <Stack.Screen name="help" options={screenOptions(STRINGS.HELP_CENTER)} />
      <Stack.Screen name="feedback" options={screenOptions(STRINGS.CONTACT_SUPPORT)} />
      <Stack.Screen name="advanced" options={screenOptions(STRINGS.ADVANCED_VOICE_GRADING)} />
      <Stack.Screen name="terms" options={screenOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={screenOptions(STRINGS.PRIVACY_POLICY)} />
      <Stack.Screen name="legal" options={screenOptions(STRINGS.LEGAL_ATTRIBUTIONS)} />
    </Stack>
  );
}
